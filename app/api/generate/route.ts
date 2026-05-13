import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

const RATE_LIMIT_COUNT = 5; 
const RATE_LIMIT_HOURS = 1; 

export async function POST(req: NextRequest) {
  try {
    // ==========================================
    // 1. RATE LIMITING LOGIC
    // ==========================================
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'anonymous_ip';

    if (supabase) {
      const timeThreshold = new Date(Date.now() - RATE_LIMIT_HOURS * 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabase
        .from('rate_limits')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .gte('created_at', timeThreshold);

      if (countError) console.error("Rate limit check error:", countError);

      if (count !== null && count >= RATE_LIMIT_COUNT) {
        return NextResponse.json(
          { error: `Rate limit exceeded. You can only generate ${RATE_LIMIT_COUNT} assessments per hour. Please take a break and try again later!` },
          { status: 429 }
        );
      }
      await supabase.from('rate_limits').insert([{ ip_address: ip }]);
    }

    // ==========================================
    // 2. NATIVE PDF PROCESSING
    // ==========================================
    const formData = await req.formData();
    const file = formData.get('pdf') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    // Convert the PDF to a Base64 string so Gemini's native engine can "see" it
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    const pdfPart = {
      inlineData: {
        data: base64Data,
        mimeType: "application/pdf"
      }
    };

    // ==========================================
    // 3. GEMINI AI LOGIC
    // ==========================================
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", // Must be 1.5 or 2.5 to support native PDFs
      systemInstruction: "You are an expert Nursing Educator. You MUST base your questions EXCLUSIVELY on the provided document.",
      generationConfig: {
        temperature: 0.1, // Lowered temperature to force strict adherence to the PDF
        responseMimeType: "application/json", 
      }
    });

    // Stricter prompt explicitly forbidding outside topics
    const promptText = `
      Attached is a PDF document. Read it carefully. 
      You MUST generate a 50-question NCLEX-style multiple choice exam based STRICTLY on the core concepts, diseases, and nursing interventions covered in this specific document. 
      
      CRITICAL INSTRUCTION: Identify the primary medical or nursing topic of the attached document. You are FORBIDDEN from generating questions about any outside medical conditions that are not explicitly mentioned in the text. 
      
      CRITICAL NCLEX RULES:
      1. Write application and analysis level questions requiring clinical judgment (e.g., prioritization, first actions).
      2. Distractors must be highly plausible but clinically inferior to the correct answer.
      3. There must be exactly ONE best correct answer.
      
      Return a JSON object EXACTLY like this:
      {
        "title": "A short, descriptive title based on the document's main topic",
        "keywords": ["NCLEX", "Topic 1", "Topic 2"],
        "questions": [
          {
            "id": 1,
            "question": "The clinical scenario...",
            "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "correctAnswer": "The exact string of the correct option",
            "explanation": "Provide a comprehensive NCLEX rationale. Explain why the correct answer is priority AND why distractors are wrong. Use Markdown (**bold** and *italics*) to emphasize concepts."
          }
        ]
      }
    `;

    // Pass BOTH the text prompt and the Native PDF part
    const result = await model.generateContent([promptText, pdfPart]);
    const responseText = result.response.text();
    const generatedData = JSON.parse(responseText);

    return NextResponse.json({ quiz: generatedData });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate quiz" }, { status: 500 });
  }
}
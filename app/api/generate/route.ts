import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

// Rate Limiting Configuration
const RATE_LIMIT_COUNT = 5; // Maximum quizzes allowed
const RATE_LIMIT_HOURS = 1; // Timeframe in hours

export async function POST(req: NextRequest) {
  try {
    // ==========================================
    // 1. RATE LIMITING LOGIC
    // ==========================================
    
    // Extract the user's IP address from the request headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'anonymous_ip';

    if (supabase) {
      // Calculate the time threshold (e.g., 1 hour ago)
      const timeThreshold = new Date(Date.now() - RATE_LIMIT_HOURS * 60 * 60 * 1000).toISOString();

      // Count how many times this IP has generated a quiz in the last hour
      const { count, error: countError } = await supabase
        .from('rate_limits')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .gte('created_at', timeThreshold);

      if (countError) {
        console.error("Rate limit check error:", countError);
      }

      // If they hit the limit, return a 429 Too Many Requests error
      if (count !== null && count >= RATE_LIMIT_COUNT) {
        return NextResponse.json(
          { error: `Rate limit exceeded. You can only generate ${RATE_LIMIT_COUNT} assessments per hour. Please take a break and try again later!` },
          { status: 429 }
        );
      }

      // If they are under the limit, log this new attempt
      await supabase.from('rate_limits').insert([{ ip_address: ip }]);
    }

    // ==========================================
    // 2. PDF PARSING LOGIC
    // ==========================================
    
    const formData = await req.formData();
    const file = formData.get('pdf') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    // NOTE: Insert your actual PDF-to-Text extraction code here
    // const pdfText = await extractTextFromPDF(file);
    const pdfText = "extracted text from pdf..."; 

    // ==========================================
    // 3. GEMINI AI LOGIC (NCLEX Prompt)
    // ==========================================
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: "You are an expert Nursing Educator and board-certified NCLEX-RN exam writer. You must base your clinical scenarios STRICTLY on the provided document. Never invent medical facts outside of standard nursing practice.",
      generationConfig: {
        temperature: 0.2,               
        responseMimeType: "application/json", 
      }
    });

    const prompt = `
      Read the attached document text and generate a 50-question NCLEX-style multiple choice exam.
      
      CRITICAL NCLEX RULES:
      1. Write application and analysis level questions requiring clinical judgment (e.g., prioritization, first actions).
      2. Avoid simple fact-recall questions.
      3. Distractors must be highly plausible but clinically inferior to the correct answer.
      4. There must be exactly ONE best correct answer.
      
      Return a JSON object EXACTLY like this:
      {
        "title": "A short, descriptive title",
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
      
      Document Text: ${pdfText}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const generatedData = JSON.parse(responseText);

    return NextResponse.json({ quiz: generatedData });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate quiz" }, { status: 500 });
  }
}
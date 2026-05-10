export const maxDuration = 60; 

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file = data.get('pdf') as File | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Pdf = buffer.toString('base64');

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: "You are an expert Nursing Educator and board-certified NCLEX-RN exam writer. You must base your clinical scenarios STRICTLY on the provided document. Never invent medical facts outside of standard nursing practice.",
        generationConfig: {
        temperature: 0.2,                     
        topP: 0.8,                            
        topK: 40,                             
        responseMimeType: "application/json", 
      }
    });

    // UPDATED PROMPT: Requesting a title, keywords, and questions
    const prompt = `
      Read the attached PDF document and generate a 50-question NCLEX-style multiple choice exam.
      
      CRITICAL NCLEX RULES:
      1. Write application and analysis level questions requiring clinical judgment (e.g., prioritization, delegation, first actions, patient teaching).
      2. Avoid simple fact-recall questions. Use clinical scenarios where a nurse must make a decision based on the text.
      3. Distractors (incorrect options) must be highly plausible but clinically inferior to the correct answer.
      4. There must be exactly ONE best correct answer.
      
      Return a JSON object with this EXACT structure:
      {
        "title": "A short, descriptive title for the clinical topic",
        "keywords": ["NCLEX", "Nursing", "Specific Topic"],
        "questions": [
          {
            "id": 1,
            "question": "The clinical scenario and question...",
            "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "correctAnswer": "The exact string of the correct option",
            "explanation": "Provide a comprehensive NCLEX rationale. You MUST explain why the correct answer is the priority action, AND explicitly state why the other three options are incorrect or lower priority. Use Markdown (**bold** and *italics*) to emphasize core concepts like **Airway, Breathing, Circulation**, **Safety**, or critical symptoms."
          }
        ]
      }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Pdf,
          mimeType: "application/pdf",
        },
      },
    ]);

    const responseText = result.response.text();
    // Parse the new object structure
    const generatedQuiz = JSON.parse(responseText);

    // Give it a unique ID and timestamp for our cache
    const completeQuiz = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...generatedQuiz
    };

    return NextResponse.json({ quiz: completeQuiz }, { status: 200 });

  } catch (error) {
    console.error("Error generating quiz:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz. Check server logs." }, 
      { status: 500 }
    );
  }
}
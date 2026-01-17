import { GoogleGenerativeAI } from '@google/generative-ai';
import { OCRSkillInput, OCRSkillOutput, BusinessCardData } from '../../types/skills';

// Initialize API client
// Note: In production, API key should be handled more securely (e.g. backend proxy) behavior
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export const ocrSkill = {
    execute: async (input: OCRSkillInput): Promise<OCRSkillOutput> => {
        const startTime = performance.now();
        console.log('Executing Gemini OCR Skill...');

        if (!apiKey) {
            throw new Error('Gemini API Key is not set in environment variables (VITE_GEMINI_API_KEY).');
        }

        try {
            // 1. Prepare Model and Prompt
            // Switching to gemini-3-flash-preview as per user request and documentation
            const model = genAI.getGenerativeModel({
                model: 'gemini-3-flash-preview',
                generationConfig: {
                    responseMimeType: "application/json",
                }
            });

            const prompt = `
            Extract the following information from the business card image and return it in JSON format.
            If a field is not found, return null. 
            Focus on Japanese text if present.
            
            Fields to extract:
            - companyName (string): Company or Organization name
            - personName (string): Full name of the person
            - personNameKana (string): Reading of the name if present (Katakana/Hiragana)
            - department (string): Department name
            - position (string): Job title / Position
            - email (string): Email address
            - phone (string): Phone number
            - mobile (string): Mobile phone number
            - address (string): Full address
            - postalCode (string): Postal code (e.g. 123-4567)
            - website (string): URL
            
            Return ONLY raw JSON without markdown code blocks.
            `;

            // 2. Prepare Image Data
            const imageBase64 = await fileToBase64(input.image as File);
            // Note: input.image is currently File | Blob | string. Assuming File/Blob for local upload.

            const imagePart = {
                inlineData: {
                    data: imageBase64.split(',')[1], // Remove 'data:image/jpeg;base64,' prefix
                    mimeType: input.mimeType
                }
            };

            // 3. Call API
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            console.log('Gemini Raw Response:', text);

            // 4. Parse JSON
            let structuredData: BusinessCardData | undefined;
            try {
                // Remove Markdown code blocks if present (Gemini sometimes adds them despite instruction)
                let jsonStr = text.replace(/```json|```/g, '').trim();

                // Extract JSON object if there's extra text
                const firstBrace = jsonStr.indexOf('{');
                const lastBrace = jsonStr.lastIndexOf('}');

                if (firstBrace !== -1 && lastBrace !== -1) {
                    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
                }

                structuredData = JSON.parse(jsonStr) as BusinessCardData;
            } catch (e) {
                console.warn('Failed to parse Gemini JSON response:', e);
                console.warn('Original Text:', text);
                // Throwing here to ensure the UI knows it failed
                throw new Error(`JSON Parsing Failed: ${e instanceof Error ? e.message : String(e)}`);
            }

            const processingTime = performance.now() - startTime;

            return {
                fullText: text,
                blocks: [], // Gemini 1.5 Pro doesn't return bounding boxes easily in this mode
                confidence: 0.9, // Placeholder
                usedMode: 'cloud',
                processingTime,
                data: structuredData
            };

        } catch (error) {
            console.error('Gemini API Error:', error);
            throw error;
        }
    }
};

// Helper
const fileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

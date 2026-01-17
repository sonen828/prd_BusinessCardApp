import { BusinessCard } from './models';

// --- Common ---
export interface SkillSettings {
    cloudOcrApiKey?: string;
    llmApiKey?: string;
    enableLlmDuplicateCheck?: boolean;
}

// --- SK-001: OCR Skill ---
export interface OCRSkillInput {
    image: string | Blob;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    languages?: ('ja' | 'en' | 'zh' | 'ko')[];
    mode?: 'cloud' | 'local' | 'auto';
}

export interface TextBlock {
    text: string;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    confidence: number;
}

export interface OCRSkillOutput {
    fullText: string;
    blocks: TextBlock[];
    confidence: number;
    usedMode: 'cloud' | 'local';
    processingTime: number;
    data?: BusinessCardData; // Direct structured output from LLM
}

// --- SK-002: Structure Skill ---
export interface StructureSkillInput {
    ocrText: string;
    textBlocks?: TextBlock[];
    context?: {
        existingCompanies?: string[];
        existingNames?: string[];
    };
}

export interface BusinessCardData {
    personName: string | null;
    personNameKana: string | null;
    companyName: string | null;
    department: string | null;
    position: string | null;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    fax: string | null;
    address: string | null;
    postalCode: string | null;
    website: string | null;
    positionLevel: string | null; // Enum type simplified for now
    industry: string | null; // Enum type simplified for now
}

export interface StructureSkillOutput {
    data: BusinessCardData;
    fieldConfidence: Record<string, number>;
    model: string;
    processingTime: number;
}

// --- SK-003: Duplicate Check Skill ---
export interface DuplicateCheckInput {
    card1: BusinessCard;
    card2: BusinessCard;
    mode?: 'strict' | 'loose' | 'auto';
}

export interface DuplicateReason {
    factor: 'email' | 'name' | 'phone' | 'company' | 'combined';
    weight: number;
    description: string;
}

export interface MergeRecommendation {
    fieldSources: Record<keyof BusinessCard, 'card1' | 'card2' | 'both'>;
    reasoning: string;
}

export interface DuplicateCheckOutput {
    probability: number;
    isDuplicate: boolean;
    reasons: DuplicateReason[];
    mergeRecommendation?: MergeRecommendation;
}

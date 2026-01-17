import { ocrSkill } from './ocrSkill';
import type { OCRSkillInput, OCRSkillOutput } from '../../types/skills';

export class SkillOrchestrator {
    async scanCard(input: OCRSkillInput): Promise<OCRSkillOutput> {
        // Phase 1: Direct call to OCR Skill
        return await ocrSkill.execute(input);
    }

    // Future methods:
    // async structurize(...)
    // async checkDuplicate(...)
}

export const orchestrator = new SkillOrchestrator();

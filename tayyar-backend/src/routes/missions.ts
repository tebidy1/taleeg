import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

router.get('/current/:studentId', async (req, res) => {
    // For MVP, always return the airport mission
    const missionId = 'mission_01_airport';
    const filePath = path.join(__dirname, '..', 'prompts', 'layer2_missions', `${missionId}.md`);
    
    try {
        // In a real app, we would parse the markdown frontmatter, or load from DB.
        // For MVP, we'll return a mock structure that matches the frontend expectations.
        res.json({
            id: missionId,
            title: "المطار",
            target_phonemes: ["/p/"],
            target_patterns: ["Can I have..."],
            target_vocabulary: ["passport", "ticket"],
            base_points: 100,
            estimated_minutes: 5,
            cefr_level: "A1"
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;

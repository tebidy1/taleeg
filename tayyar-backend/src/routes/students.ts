import { Router } from 'express';
import { getStudentFromDB } from '../services/supabase';

const router = Router();

router.get('/:id', async (req, res) => {
    try {
        const student = await getStudentFromDB(req.params.id);
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }
        res.json(student);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Mock login to return the test student
router.post('/login', async (req, res) => {
    try {
        const student = await getStudentFromDB("student_test_1");
        res.json({ token: "mock_token", student });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;

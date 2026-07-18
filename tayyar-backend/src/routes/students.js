"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../services/supabase");
const router = (0, express_1.Router)();
router.get('/:id', async (req, res) => {
    try {
        const student = await (0, supabase_1.getStudentFromDB)(req.params.id);
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }
        res.json(student);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// Mock login to return the test student
router.post('/login', async (req, res) => {
    try {
        const student = await (0, supabase_1.getStudentFromDB)("student_test_1");
        res.json({ token: "mock_token", student });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
exports.default = router;
//# sourceMappingURL=students.js.map
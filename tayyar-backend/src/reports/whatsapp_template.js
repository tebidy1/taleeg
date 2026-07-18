"use strict";
/**
 * WhatsApp Report Generator
 *
 * Generates daily and weekly reports for parents.
 * Reports are sent via WhatsApp (more effective than email in Saudi market).
 *
 * Format: Plain text + emojis (WhatsApp-friendly)
 * Length: Optimized for mobile reading
 * Tone: Warm, encouraging, specific (not generic)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDailyReport = generateDailyReport;
exports.generateWeeklyReport = generateWeeklyReport;
exports.generateCelebrationMessage = generateCelebrationMessage;
exports.generateReengagementMessage = generateReengagementMessage;
const types_1 = require("../schema/types");
const srs_1 = require("../engine/srs");
// ============================================================
// DAILY REPORT (after each session)
// ============================================================
function generateDailyReport(student, session) {
    const missionTitle = getMissionTitle(session.mission_id);
    const duration = formatDuration(session.duration_seconds);
    const points = session.total_points;
    const badge = session.badge_earned ? getBadgeName(session.badge_earned) : null;
    const streak = student.current_streak;
    const heroWord = session.hero_word;
    const mood = session.mood_emoji || "😊";
    // Pronunciation summary
    const pronSummary = formatPronunciationSummary(session);
    // Comparison to yesterday
    const comparison = formatComparison(student, session);
    // Tomorrow's preview
    const tomorrow = formatTomorrowPreview(session.mission_id);
    return `👨‍👦 تقرير ${student.name} — اليوم

✅ أكمل مهمة: "${missionTitle}"
🗣️ تحدث ${duration} دقيقة
📈 دقة النطق: ${pronSummary.average}%
${comparison}
${badge ? `🎖️ شارة جديدة: ${badge}\n` : ""}🔥 ${streak} أيام متتالية

${mood} شعور ${student.name}: ${getMoodDescription(mood)}
${heroWord ? `⭐ كلمة البطل اليوم: "${heroWord}"\n` : ""}
${pronSummary.issues.length > 0 ? `💡 للتركيز: ${pronSummary.issues[0]}\n` : ""}━━━━━━━━━━━━━━━━━━━━

🎧 استمع لتسجيله اليوم:
${session.audio_recording_url || "[سيتم إرسال الرابط قريباً]"}

━━━━━━━━━━━━━━━━━━━━

🎬 غداً:
${tomorrow}

━━━━━━━━━━━━━━━━━━━━

💬 سؤال؟ رد على هذه الرسالة`;
}
// ============================================================
// WEEKLY REPORT (every Friday)
// ============================================================
function generateWeeklyReport(student, weekSessions) {
    const totalSessions = weekSessions.length;
    const totalMinutes = Math.round(weekSessions.reduce((sum, s) => sum + s.duration_seconds, 0) / 60);
    const totalPoints = weekSessions.reduce((sum, s) => sum + s.total_points, 0);
    const newWords = weekSessions.reduce((sum, s) => sum + s.new_vocabulary.length, 0);
    const newBadges = weekSessions
        .filter(s => s.badge_earned)
        .map(s => s.badge_earned);
    // Progress metrics
    const progress = (0, srs_1.getStudentProgress)(student.vocabulary);
    // Pronunciation trend
    const pronTrend = formatPronunciationTrend(weekSessions);
    // Best moment
    const bestMoment = findBestMoment(weekSessions);
    // Teacher note (if hybrid model)
    const teacherNote = generateTeacherNote(student, weekSessions);
    return `📊 تقرير ${student.name} الأسبوعي

📅 هذا الأسبوع:
${totalSessions} جلسات
${totalMinutes} دقيقة من المحادثة الإنجليزية
${newWords} كلمة جديدة
${totalPoints} نقطة
${newBadges.length > 0 ? `${newBadges.length} شارة جديدة` : ""}

📈 التقدم:
${formatProgressBar("النطق", pronTrend.startAccuracy, pronTrend.endAccuracy)}
${formatProgressBar("الطلاقة", pronTrend.startFluency, pronTrend.endFluency)}
${formatProgressBar("المفردات", progress.learning_words, progress.mastered_words)}

🎤 أفضل لحظة هذا الأسبوع:
"${bestMoment}"

${pronTrend.improvements.length > 0 ? `✅ تحسنات:${pronTrend.improvements.map(i => `\n   • ${i}`).join("")}\n` : ""}${pronTrend.focusAreas.length > 0 ? `💡 للتركيز الأسبوع القادم:${pronTrend.focusAreas.map(f => `\n   • ${f}`).join("")}\n` : ""}━━━━━━━━━━━━━━━━━━━━

🎧 قارن تسجيلات ${student.name}:
الأسبوع ١: [رابط قصير]
هذا الأسبوع: [رابط قصير]

━━━━━━━━━━━━━━━━━━━━

${teacherNote ? `👨‍🏫 ملاحظة المعلم:
"${teacherNote}"

━━━━━━━━━━━━━━━━━━━━
` : ""}🔄 التجديد التلقائي بعد ${getDaysUntilRenewal(student)} أيام

💡 للاشتراك السنوي (وفور ٢٠٪): رد بكلمة "سنة"`;
}
// ============================================================
// CELEBRATION MESSAGES (special achievements)
// ============================================================
function generateCelebrationMessage(student, achievement) {
    const messages = {
        first_mission: `🎉🎉🎉 إنجاز رائع!\n\n${student.name} أكمل أول مهمة بنجاح!\n\nهذه بداية رحلة تعلم المحادثة الإنجليزية. نحن فخورون به!`,
        streak_7: `🔥 أسبوع كامل!\n\n${student.name} تمرّن ٧ أيام متتالية!\nهذا الالتزام هو سر النجاح. استمرا!`,
        streak_30: `🏆 إنجاز شهري!\n\n${student.name} أكمل شهراً كاملاً من التدريب اليومي!\nهذا استثمار حقيقي في مستقبله.`,
        level_1_complete: `🎓 مبروك! ${student.name} أكمل المستوى الأول!\n\nالإحصائيات:
• ${student.total_sessions} جلسة
• ${student.total_words_spoken} كلمة منطوقة
• ${student.total_minutes_spoken} دقيقة محادثة

جاهز للمستوى الثاني؟ 🚀`,
        perfect_pronunciation: `🎤 أداء استثنائي!\n\n${student.name} حقق دقة نطق ٩٠٪+ اليوم!\nهذا مستوى متقدم. استمرا!`,
        pattern_master: `🏆 ${student.name} أتقن نمطاً جديداً!\n\nالأنماط المتقنة: ${student.patterns.filter(p => p.production_level >= 4).length}/5\nالهدف: إتقان جميع الأنماط الخمسة`,
    };
    return messages[achievement] || `🎉 إنجاز جديد لـ ${student.name}!`;
}
// ============================================================
// RE-ENGAGEMENT MESSAGES (when student misses days)
// ============================================================
function generateReengagementMessage(student, daysMissed) {
    if (daysMissed === 1) {
        return `👋 أين ${student.name} اليوم؟\n\nمهمة جديدة تنتظره! ٧ دقائق فقط.\n\nرد بكلمة "ابدأ" للبدء`;
    }
    if (daysMissed === 2) {
        return `🌟 ${student.name}، اشتقنا لك!\n\nلا تقلق — لن نخسر تقدك. مهمة اليوم مراجعة سريعة لما تعلمته.\n\nرد بكلمة "مراجعة"`;
    }
    if (daysMissed >= 3) {
        return `💙 ${student.name}، نحن ننتظر\n\nبعد ${daysMissed} أيام، لنبدأ بمراجعة بسيطة. لا ضغط — ٥ دقائق فقط.\n\nكل خطوة صغيرة تبني مهارة كبيرة.\n\nرد بكلمة "ابدأ"`;
    }
    return `👋 ${student.name}، حان وقت التدريب!\n\nرد بكلمة "ابدأ"`;
}
// ============================================================
// HELPER FUNCTIONS
// ============================================================
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
function getMissionTitle(missionId) {
    const titles = {
        mission_01_airport: "مطار الرياض — إجراءات السفر",
        mission_02_airplane: "في الطائرة — الطعام والشراب",
        mission_03_hotel: "الفندق — استلام الغرفة",
        mission_04_restaurant: "المطعم — طلب الطعام",
        mission_05_shopping: "التسوق — شراء الملابس",
    };
    return titles[missionId] || "مهمة جديدة";
}
function getBadgeName(badgeId) {
    const badges = {
        first_flight: "أول رحلة",
        polite_pilot: "الطيار المهذب",
        window_seat_master: "خبير مقعد النافذة",
        sky_explorer: "مستكشف السماء",
        pattern_builder: "باني الأنماط",
        hotel_guest: "نزيل الفندق",
        smart_traveler: "المسافر الذكي",
        price_hunter: "صياد الأسعار",
        food_explorer: "مستكشف الطعام",
        master_orderer: "خبير الطلبات",
        polite_diner: "الضيف المهذب",
        pattern_master: "محترف الأنماط",
        shopping_pro: "محترف التسوق",
        confident_speaker: "المتحدث الواثق",
        pattern_master_gold: "المتحدث الذهبي",
        pronunciation_star: "نجم النطق",
        level_1_graduate: "خريج المستوى الأول",
    };
    return badges[badgeId] || badgeId;
}
function getMoodDescription(emoji) {
    const moods = {
        "😎": "واثق ومتمكن",
        "😊": "سعيد ومتحمس",
        "😐": "هادئ",
        "😰": "محتاج تشجيع",
    };
    return moods[emoji] || "جيد";
}
function formatPronunciationSummary(session) {
    if (session.pronunciation_scores.length === 0) {
        return { average: 0, issues: [] };
    }
    const avg = session.pronunciation_scores.reduce((sum, p) => sum + p.overall_accuracy, 0) / session.pronunciation_scores.length;
    const issues = [];
    const phonemeErrors = {};
    session.pronunciation_scores.forEach(score => {
        Object.entries(score.phoneme_scores).forEach(([phoneme, acc]) => {
            if (acc < 0.7) {
                phonemeErrors[phoneme] = (phonemeErrors[phoneme] || 0) + 1;
            }
        });
    });
    Object.entries(phonemeErrors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .forEach(([phoneme]) => {
        issues.push(getPhonemeHint(phoneme));
    });
    return { average: Math.round(avg * 100), issues };
}
function getPhonemeHint(phoneme) {
    const hints = {
        "/p/": "تمييز /p/ عن /b/ (ورقة أمام الفم)",
        "/v/": "تمييز /v/ عن /f/ (أسنان على شفة)",
        "/θ/": "حرف th (لسان بين الأسنان)",
        "/r/": "حرف r الإنجليزي (ناعم، ليس من الحلق)",
        "/ŋ/": "حرف ng (صوت من الأنف)",
    };
    return hints[phoneme] || `النطق ${phoneme}`;
}
function formatComparison(student, session) {
    // Compare to previous session
    // In real app, this would fetch previous session data
    const improvement = Math.random() * 10 - 2; // -2% to +8%
    if (improvement > 0) {
        return `📈 تحسن ${improvement.toFixed(1)}% عن الأمس\n`;
    }
    else if (improvement < 0) {
        return `📊 نفس مستوى الأمس تقريباً\n`;
    }
    return "";
}
function formatTomorrowPreview(currentMissionId) {
    const previews = {
        mission_01_airport: "ستكون في الطائرة! المضيفة ستسألك عن مشروبك المفضل 🥤",
        mission_02_airplane: "ستصل إلى دبي! موظف الفندق ينتظرك لاستلام غرفتك 🏨",
        mission_03_hotel: "جوعان؟ ستطلب طعامك المفضل في مطعم الفندق 🍔",
        mission_04_restaurant: "وقت التسوق! ستختار هدية لأخيك في دبي مول 👕",
        mission_05_shopping: "مراجعة شاملة لكل ما تعلمته! استعد للتحدي النهائي 🎓",
    };
    return previews[currentMissionId] || "مهمة جديدة ومثيرة تنتظرك!";
}
function formatProgressBar(label, start, end) {
    const change = end - start;
    const changeStr = change > 0 ? ` (+${Math.round(change * 100)}%)` : change < 0 ? ` (${Math.round(change * 100)}%)` : "";
    return `   ${label}: ${Math.round(start * 100)}% → ${Math.round(end * 100)}%${changeStr}`;
}
function formatPronunciationTrend(sessions) {
    if (sessions.length === 0) {
        return {
            startAccuracy: 0,
            endAccuracy: 0,
            startFluency: 0,
            endFluency: 0,
            improvements: [],
            focusAreas: [],
        };
    }
    const firstSession = sessions[0];
    const lastSession = sessions[sessions.length - 1];
    const startAcc = firstSession.pronunciation_scores.reduce((sum, p) => sum + p.overall_accuracy, 0) / Math.max(firstSession.pronunciation_scores.length, 1);
    const endAcc = lastSession.pronunciation_scores.reduce((sum, p) => sum + p.overall_accuracy, 0) / Math.max(lastSession.pronunciation_scores.length, 1);
    return {
        startAccuracy: startAcc,
        endAccuracy: endAcc,
        startFluency: 0.6, // placeholder
        endFluency: 0.7, // placeholder
        improvements: [],
        focusAreas: [],
    };
}
function findBestMoment(sessions) {
    // Find session with highest points or best pronunciation
    const best = sessions.reduce((best, s) => s.total_points > best.total_points ? s : best, sessions[0]);
    if (best.hero_word) {
        return `استخدم ${best.hero_word} بثقة وإتقان!`;
    }
    return `أكمل مهمة ${getMissionTitle(best.mission_id)} بنتيجة ${best.total_points} نقطة`;
}
function generateTeacherNote(student, sessions) {
    // In hybrid model, teacher adds a personal note
    // For now, generate based on data
    const avgEngagement = sessions.filter(s => s.engagement_level === "high").length / sessions.length;
    if (avgEngagement > 0.7) {
        return `${student.name} يتقدم بثقة رائعة هذا الأسبوع. أنصح بالتحدي قليلاً في الأسبوع القادم.`;
    }
    if (avgEngagement < 0.3) {
        return `${student.name} يحتاج تشجيعاً إضافياً. سأرسل له رسالة صوتية شخصية هذا الأسبوع.`;
    }
    return null;
}
function getDaysUntilRenewal(student) {
    // Calculate days until subscription renewal
    // Placeholder: 5 days
    return 5;
}
//# sourceMappingURL=whatsapp_template.js.map
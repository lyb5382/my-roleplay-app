const mongoose = require('mongoose');

const CharacterCardSchema = new mongoose.Schema({
    title: { type: String, required: true },
    summary: String,
    description: String,
    thumbnailUrl: String,
    backgroundUrl: String,
    systemPrompt: { type: String, required: true },
    guideline: String,
    // 멀티 프롤로그
    prologues: [{
        title: String,
        guide: String,
        description: String
    }],
    // 키워드 트리거
    keywords: [{
        trigger: [String], // 🚨 여기를 String에서 [String] (배열)로 바꿔라!
        action: String,
        priority: Number
    }]
}, { timestamps: true });

module.exports = mongoose.model('CharacterCard', CharacterCardSchema);
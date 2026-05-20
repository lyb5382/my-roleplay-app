const mongoose = require('mongoose');

const CharacterCardSchema = new mongoose.Schema({
    title: { type: String, required: true },
    summary: String,
    description: String,
    systemPrompt: { type: String, required: true },
    guideline: String,

    // 🚨 [통합 개조] 초상화/배경 구분 삭제! 이름, URL, 상황 설명으로 심플하게 간다.
    visualAssets: [{
        tag: { type: String, required: true }, // 이미지 이름 (예: happy, dark_dungeon, fight_scene)
        url: { type: String, required: true }, // 이미지 URL 링크
        description: String                    // 이 이미지가 출력되어야 하는 상황 설명 (예: 봇이 부끄러워할 때, 어두운 던전 안 요사)
    }],

    prologues: [{ title: String, guide: String, description: String }],
    keywords: [{ trigger: [String], action: String, priority: Number }]
}, { timestamps: true });

// 가상 필드: 메인 로비에 뿌려줄 기본 썸네일은 tag가 'default'인 놈으로 땡겨옴
CharacterCardSchema.virtual('thumbnailUrl').get(function () {
    const defaultAsset = this.visualAssets.find(a => a.tag === 'default');
    return defaultAsset ? defaultAsset.url : (this.visualAssets[0]?.url || '');
});

module.exports = mongoose.model('CharacterCard', CharacterCardSchema);
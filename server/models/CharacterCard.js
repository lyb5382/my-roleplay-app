const mongoose = require('mongoose');

const CharacterCardSchema = new mongoose.Schema({
    title: { type: String, required: true },
    summary: String,
    description: String,
    systemPrompt: { type: String, required: true },
    guideline: String,
    // 🚨 잼스 검거: 이거 스키마 내부에 쑤셔박아야 진짜 저장되는 거다!
    defaultModel: { type: String, default: 'qwen/qwen-2.5-72b-instruct' },

    visualAssets: [{
        tag: { type: String, required: true },
        url: { type: String, required: true },
        description: String
    }],

    prologues: [{ title: String, guide: String, description: String }],
    keywords: [{ trigger: [String], action: String, priority: Number }]
}, { timestamps: true });

CharacterCardSchema.virtual('thumbnailUrl').get(function () {
    // 🚨 잼스 방어막: visualAssets 배열이 아예 없거나 비어있으면 뻗지 말고 걍 빈 칸 리턴해라!
    if (!this.visualAssets || this.visualAssets.length === 0) return '';

    const defaultAsset = this.visualAssets.find(a => a.tag === 'default');
    return defaultAsset ? defaultAsset.url : (this.visualAssets[0]?.url || '');
});

module.exports = mongoose.model('CharacterCard', CharacterCardSchema);
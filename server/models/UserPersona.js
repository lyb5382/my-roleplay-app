const mongoose = require('mongoose');

const personaSchema = new mongoose.Schema({
    name: { type: String, required: true },       // 유저가 플레이할 이름
    description: { type: String, required: true },// 외모, 성격, 배경 등 세팅값
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserPersona', personaSchema);
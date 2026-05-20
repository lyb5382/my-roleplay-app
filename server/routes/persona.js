const express = require('express');
const router = express.Router();
const UserPersona = require('../models/UserPersona');

// 내 롤플 캐릭터 신규 생성
router.post('/create', async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !description) return res.status(400).json({ success: false, error: '이름이랑 설정은 필수야' });

        const newPersona = new UserPersona({ name, description });
        await newPersona.save();

        console.log(`✨ 새 유저 페르소나 [${name}] 저장 완료!`);
        res.status(201).json({ success: true, persona: newPersona });
    } catch (error) {
        console.error('❌ 페르소나 생성 중 서버 좆됨:', error);
        res.status(500).json({ success: false, error: '서버 에러남' });
    }
});

// 내 캐릭터 목록 불러오기 (나중에 채팅방 진입 전 콤보박스용)
router.get('/list', async (req, res) => {
    try {
        const personas = await UserPersona.find({});
        res.json({ success: true, list: personas });
    } catch (error) {
        res.status(500).json({ success: false, error: '목록 못 불러옴' });
    }
});

// 🎭 유저 페르소나 데이터 직접 수정하기
router.put('/:id', async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !description) return res.status(400).json({ success: false, error: '다 채워라 파트너' });

        // 🚨 Persona -> UserPersona로 수정!
        const updatedPersona = await UserPersona.findByIdAndUpdate(
            req.params.id,
            { name, description },
            { new: true }
        );
        if (!updatedPersona) return res.status(404).json({ success: false, error: '그딴 페르소나 없음' });
        res.json({ success: true, persona: updatedPersona });
    } catch (error) {
        res.status(500).json({ success: false, error: '서버 터짐' });
    }
});

// 🗑️ 유저 페르소나 영구 삭제하기
router.delete('/:id', async (req, res) => {
    try {
        // 🚨 Persona -> UserPersona로 수정!
        const persona = await UserPersona.findByIdAndDelete(req.params.id);
        if (!persona) return res.status(404).json({ success: false, error: '이미 없는 프로필' });
        res.json({ success: true, message: '페르소나 컷 완료' });
    } catch (error) {
        res.status(500).json({ success: false, error: '서버 터짐' });
    }
});

module.exports = router;
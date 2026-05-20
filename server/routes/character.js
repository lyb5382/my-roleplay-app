const express = require('express');
const router = express.Router();
const CharacterCard = require('../models/CharacterCard');

// 1. 캐릭터 카드 신규 등록 (제작자 용)
router.post('/create', async (req, res) => {
    try {
        const { title, summary, thumbnailUrl, systemPrompt, guideline, prologues, keywords } = req.body;

        // 파워 J 파트너를 위한 최소한의 유효성 검사 (필수값 체크)
        if (!title || !systemPrompt) {
            return res.status(400).json({ success: false, error: '작품 이름이랑 코어 프롬프트는 필수야 이 양반아' });
        }

        const newCharacter = new CharacterCard({
            title,
            summary,
            thumbnailUrl,
            systemPrompt,
            guideline,
            prologues: prologues || [],
            keywords: keywords || []
        });

        await newCharacter.save();
        console.log(`✨ 새 캐릭터 카드 [${title}] DB 저장 완료!`);

        res.status(201).json({ success: true, character: newCharacter });
    } catch (error) {
        console.error('❌ 캐릭터 생성 중 서버 좆됨:', error);
        res.status(500).json({ success: false, error: '서버 에러남, 로그 봐라' });
    }
});

// 2. 전체 캐릭터 카드 목록 가져오기 (메인 페이지 로딩용)
router.get('/list', async (req, res) => {
    try {
        // 굳이 무거운 프롬프트 다 긁어올 필요 없으니 메인에 띄울 가벼운 정보만 셀렉트
        const characters = await CharacterCard.find({}, 'title summary thumbnailUrl createdAt');
        res.json({ success: true, list: characters });
    } catch (error) {
        console.error('❌ 캐릭터 목록 조회 중 좆됨:', error);
        res.status(500).json({ success: false, error: '목록 못 불러옴' });
    }
});

// 3. 특정 캐릭터 상세 정보 가져오기 (채팅방 진입할 때 땡겨올 용도)
router.get('/:id', async (req, res) => {
    try {
        const character = await CharacterCard.findById(req.params.id);
        if (!character) {
            return res.status(404).json({ success: false, error: '그런 캐릭터 없다' });
        }
        res.json({ success: true, character });
    } catch (error) {
        console.error('❌ 캐릭터 상세 조회 중 좆됨:', error);
        res.status(500).json({ success: false, error: '상세보기 실패' });
    }
});

module.exports = router;
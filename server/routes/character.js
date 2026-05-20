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

// 🧪 샌드박스 테스터 전용 1회성 AI 호출 API (DB 저장 없음)
router.post('/sandbox/test', async (req, res) => {
    try {
        const { systemPrompt, guideline, useGuideline, messages, visualAssets, keywords } = req.body;

        // 1. 실시간으로 조립하는 시스템 지시어
        let systemContent = `${systemPrompt}`;
        if (useGuideline && guideline) {
            systemContent += `\n[절대 규칙]: ${guideline}`;
        }

        // 💡 다이내믹 이미지 에셋 정보도 AI한테 힌트로 쑤셔넣어줌 (눈치껏 고르게)
        if (visualAssets && visualAssets.length > 0) {
            systemContent += `\n\n[사용 가능한 비주얼 에셋 목록]\n유저가 상황에 맞는 이미지를 요구하거나 맥락상 어울릴 때 아래 태그 중 가장 적합한 하나를 골라 반드시 문장 맨 끝에 '||asset_tag:태그이름||' 형식으로 텍스트에 포함시켜라.\n`;
            visualAssets.forEach(a => {
                systemContent += `- 태그: ${a.tag} (상황: ${a.description || '없음'})\n`;
            });
        }

        // 2. 명령어(키워드) 트리거 작동 유무 백엔드 검사 (상위 3개 제한 규칙 반영)
        let injectedAction = "";
        if (messages.length > 0 && keywords && keywords.length > 0) {
            const lastUserMsg = messages[messages.length - 1].content;

            // 우선순위(Priority) 숫자가 낮은 순(1순위가 먼저)으로 정렬해서 검사
            const sortedKeywords = [...keywords].sort((a, b) => Number(a.priority) - Number(b.priority));
            let matchCount = 0;

            for (const k of sortedKeywords) {
                if (!k.trigger || !k.action) continue;

                // 쉼표로 쪼개져 있는 트리거 단어들 배열로 정렬
                const triggerList = Array.isArray(k.trigger)
                    ? k.trigger
                    : k.trigger.split(',').map(t => t.trim()).filter(t => t !== '');

                // 유저 입력에 키워드가 포함되어 있는지 매칭
                const isMatched = triggerList.some(trig => lastUserMsg.includes(trig));

                if (isMatched) {
                    injectedAction += `\n[시스템 강제 명령 (키워드 트리거 발동)]: ${k.action}`;
                    matchCount++;
                    if (matchCount >= 3) break; // 명세서 요구사항: 최대 3개까지만 복합 적용
                }
            }
        }

        // 3. AI 쏘기용 대화 구조 조립
        const messagesForAI = [
            { role: 'system', content: systemContent + injectedAction },
            ...messages.map(m => ({ role: m.role, content: m.content }))
        ];

        // 4. 오픈라우터 뇌 풀가동 (안전 수치 반영)
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'qwen/qwen-2.5-72b-instruct',
            messages: messagesForAI,
            temperature: 0.8,
            max_tokens: 1500,
            top_p: 0.9,
            repetition_penalty: 1.1
        }, {
            headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` }
        });

        if (!response.data || !response.data.choices || response.data.choices.length === 0) {
            return res.status(500).json({ success: false, error: '오픈라우터 응답 찐빠남' });
        }

        const aiReply = response.data.choices[0].message.content;
        res.json({ success: true, reply: aiReply });

    } catch (error) {
        console.error('❌ 샌드박스 통신 좆됨:', error.message);
        res.status(500).json({ success: false, error: '테스터 뇌회로 타버림' });
    }
});

// 🛠️ 캐릭터 카드 수정 (조물주의 재창조)
router.put('/:id', async (req, res) => {
    try {
        const updatedChar = await CharacterCard.findByIdAndUpdate(
            req.params.id,
            req.body, // 프론트에서 보낸 수정된 데이터 통째로 덮어쓰기
            { new: true }
        );

        if (!updatedChar) {
            return res.status(404).json({ success: false, error: '그런 캐릭터 없는데?' });
        }

        console.log(`✨ 캐릭터 [${updatedChar.title}] 수정 완료!`);
        res.json({ success: true, character: updatedChar });
    } catch (error) {
        console.error('❌ 캐릭터 수정 중 좆됨:', error);
        res.status(500).json({ success: false, error: '수정하다 서버 터짐' });
    }
});

module.exports = router;
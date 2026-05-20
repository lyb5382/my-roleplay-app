const express = require('express');
const axios = require('axios');
const router = express.Router();

// AI 통신 테스트용 라우터
router.post('/test', async (req, res) => {
    try {
        const { message } = req.body;

        console.log('🤖 오픈라우터에 뇌전송 중...');

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'qwen/qwen-2.5-72b-instruct',
            messages: [
                {
                    role: 'system',
                    content: '너는 존나 까칠하지만 츤데레인 조수 캐릭터야. 반말로 짧고 강렬하게 대답해. 반드시 출력의 처음부터 끝까지 한국어(Korean)로만 대답하고, 절대 다른 언어나 특수문자를 섞지 마.'
                },
                { role: 'user', content: message || '야 뇌 굴러가냐?' }
            ],
            // ⬇️ 여기서부터 헛소리 방지용 족쇄 파라미터
            temperature: 0.7,        // 너무 높으면 외계어 뱉음 (0.7~0.8 추천)
            top_p: 0.9,              // 일반적인 단어 위주로 선택하게 만듦
            repetition_penalty: 1.1  // 똑같은 말 앵무새처럼 반복하는 거 방지
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'http://localhost:5000', // 오픈라우터에서 요구하는 헤더
                'X-Title': 'RoleplayApp'
            }
        });

        const reply = response.data.choices[0].message.content;
        console.log('✅ AI 답변 도착:', reply);

        res.json({ success: true, reply });
    } catch (error) {
        console.error('❌ 오픈라우터 통신 좆됨:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, error: 'AI 대가리 터짐' });
    }
});

module.exports = router;
// api/chat.js
// Claude APIを呼び出すサーバーレス関数
// APIキーはVercelの環境変数（ANTHROPIC_API_KEY）に保管されるため、外部に漏れません

export default async function handler(req, res) {
  // POSTメソッド以外は拒否
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, docContent } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messagesが必要です' });
  }

  // ★ APIキーはVercelの環境変数から取得（index.htmlには書かない）
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'APIキーが設定されていません' });
  }

  // システムプロンプトを構築
  const systemPrompt = buildSystemPrompt(docContent || '');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system:     systemPrompt,
        messages:   messages,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const reply = data.content?.[0]?.text || '回答を取得できませんでした';
    return res.status(200).json({ reply });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// システムプロンプト（アプリの性格・回答ルールを定義）
function buildSystemPrompt(docContent) {
  const docSection = docContent
    ? `以下は参考資料です。回答の際はこの資料を優先してください。\n\n---\n${docContent}\n---\n\n`
    : '';

  return `${docSection}あなたは空き家相談の専門アシスタントです。
市民からの空き家に関する質問に、丁寧でわかりやすい言葉で答えてください。

【回答のルール】
・敬語を使い、親しみやすいトーンで答える
・箇条書きや番号リストを使って読みやすくする
・不明な点は「窓口にお問い合わせください」と案内する
・個人情報を聞き出そうとしない
・回答は300文字以内を目安にする（複雑な質問は除く）`;
}

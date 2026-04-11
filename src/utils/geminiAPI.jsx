
const MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-001',
  'gemini-2.5-flash-lite',
]

export const askGemini = async (messages, systemPrompt) => {
  const key = import.meta.env.VITE_GEMINI_API_KEY

  for (const model of MODELS) {
    try {
      const response = await fetch(
        `/api/gemini/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemPrompt }]
            },
            contents: messages.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            }))
          })
        }
      )

      const data = await response.json()

      // If quota exceeded or overloaded, try next model
      if (data.error) {
        console.warn(`Model ${model} failed:`, data.error.message)
        continue
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return text

    } catch (err) {
      console.warn(`Model ${model} errored:`, err.message)
      continue
    }
  }

  throw new Error('All models are currently unavailable. Please try again later.')
}
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

type Msg = { role: 'bot' | 'user'; text: string }

const replies: { match: RegExp; text: string }[] = [
  {
    match: /병원|동행|외래/,
    text: '병원 동행은 집 출발부터 접수·진료 대기·귀가까지 함께합니다. 서비스 메뉴에서 ‘병원 동행’을 선택해 바로 예약할 수 있어요.',
  },
  {
    match: /돌봄|노인|아이|간병/,
    text: '노인·아이·가정·병원 돌봄을 제공합니다. 일정과 장소를 알려주시면 가까운 매니저를 매칭해 드릴게요.',
  },
  {
    match: /요금|가격|비용|얼마/,
    text: '정기결제 없이 이용한 만큼만 결제합니다. 병원 동행 기준 데모 요금은 약 35,000원/3시간이며, 연장 시 시간당 추가됩니다.',
  },
  {
    match: /투석|검진|입.?퇴원/,
    text: '투석·건강검진·입/퇴원 전용 동행도 있어요. 서비스 탭에서 해당 항목을 고르면 됩니다.',
  },
  {
    match: /매칭|매니저|시간/,
    text: '위치 기반으로 근처 가능 매니저를 실시간 매칭합니다. 보통 수 초~수분 내 배정되며, 확정 후 일정이 고정됩니다.',
  },
]

function replyTo(input: string) {
  const hit = replies.find((r) => r.match.test(input))
  return (
    hit?.text ??
    '데모 챗봇입니다. “병원 동행”, “돌봄”, “요금”, “매칭”처럼 물어보시면 안내해 드릴게요. 바로 신청하려면 서비스 메뉴로 이동해 주세요.'
  )
}

export function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'bot',
      text: '안녕하세요, 모시미+ 상담 챗봇입니다. 병원 동행·돌봄 예약과 요금을 도와드릴게요.',
    },
  ])
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: replyTo(text) },
      ])
    }, 450)
  }

  return (
    <div className="page chat-page">
      <header className="page-header compact">
        <p className="brand-inline">모시미+</p>
        <h1>상담 챗봇</h1>
      </header>

      <div className="chat-thread">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="quick-asks">
        {['병원 동행 신청', '요금이 궁금해요', '돌봄 서비스'].map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              setMessages((prev) => [...prev, { role: 'user', text: q }])
              setTimeout(() => {
                setMessages((prev) => [
                  ...prev,
                  { role: 'bot', text: replyTo(q) },
                ])
              }, 450)
            }}
          >
            {q}
          </button>
        ))}
      </div>

      <form className="chat-input" onSubmit={send}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지를 입력하세요"
        />
        <button type="submit" className="btn primary">
          전송
        </button>
      </form>

      <Link to="/services" className="text-link center-link">
        서비스 신청으로 이동 →
      </Link>
    </div>
  )
}

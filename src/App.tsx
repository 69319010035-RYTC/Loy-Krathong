import { Suspense, lazy, useRef, useState } from 'react'
import type { FormEvent, PointerEvent } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Camera, Flame, Heart, MoonStar, Move3D, PartyPopper, RotateCcw, Send, Sparkles, Waves } from 'lucide-react'
import './App.css'
import type { FireworkBurstData, FloatingLantern, GraphicsQuality } from './scene/FestivalScene'

const FestivalScene = lazy(() => import('./scene/FestivalScene'))

function App() {
  const [name, setName] = useState('')
  const [wishes, setWishes] = useState<FloatingLantern[]>([])
  const [message, setMessage] = useState('')
  const [freeCamera, setFreeCamera] = useState(false)
  const [quality, setQuality] = useState<GraphicsQuality>('balanced')
  const [fireworks, setFireworks] = useState<FireworkBurstData[]>([])
  const [cameraKeys, setCameraKeys] = useState<string[]>([])
  const [cameraResetToken, setCameraResetToken] = useState(0)
  const [extraSkyLanterns, setExtraSkyLanterns] = useState(0)
  const fireworkId = useRef(0)
  const nameInput = useRef<HTMLInputElement>(null)

  const releaseWish = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const wishName = name.trim().replace(/\s+/g, ' ')

    if (!wishName) {
      setMessage('ใส่ชื่อของคุณก่อนปล่อยกระทงนะ')
      nameInput.current?.focus()
      return
    }

    const newWish: FloatingLantern = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: wishName.slice(0, 16),
      x: (Math.random() - 0.5) * 5.4,
      z: 8.6 + Math.random() * 1.8,
      hue: 0.08 + Math.random() * 0.1,
      drifting: true,
    }

    setWishes((current) => [newWish, ...current])
    setName('')
    setMessage(`กระทงของ ${newWish.name} กำลังลอยไปกับสายน้ำ ✨`)
  }

  const focusWishInput = () => nameInput.current?.focus()
  const holdCameraKey = (key: string) => (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setCameraKeys((current) => current.includes(key) ? current : [...current, key])
  }
  const releaseCameraKey = (key: string) => () => {
    setCameraKeys((current) => current.filter((pressed) => pressed !== key))
  }

  return (
    <div className={`festival-shell${freeCamera ? ' is-free-camera' : ''}`}>
      <div className="scene-stage" role="img" aria-label="ฉากจำลองงานลอยกระทงยามค่ำคืน มีวัด ร้านเทศกาล ผู้คน และกระทงลอยน้ำ">
        <Suspense fallback={null}>
          <FestivalScene
            lanterns={wishes}
            freeCamera={freeCamera}
            fireworks={fireworks}
            quality={quality}
            cameraKeys={cameraKeys}
            cameraResetToken={cameraResetToken}
            extraSkyLanterns={extraSkyLanterns}
            onLanternSelect={(id) => {
              const lantern = wishes.find((wish) => wish.id === id)
              if (lantern) setMessage(`คำอธิษฐานของ ${lantern.name} ลอยไปกับสายน้ำแล้ว`)
            }}
          />
        </Suspense>
      </div>
      <div className="scene-vignette" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#home" aria-label="ลอยกระทง กลับหน้าหลัก">
          <span className="brand-mark"><Waves size={19} strokeWidth={1.7} /></span>
          <span className="brand-copy"><strong>ลอยกระทง</strong><small>RIVER OF WISHES</small></span>
        </a>
        <div className="festival-chip"><span className="live-dot" /> คืนแห่งแสงและสายน้ำ</div>
        <button className="explore-hint" type="button" onClick={focusWishInput}>
          <Move3D size={16} /> <span>ร่วมลอยกระทง</span> <ArrowUpRight size={14} />
        </button>
      </header>

      <nav className="scene-controls" aria-label="ควบคุมฉาก 3 มิติ">
        <label className="quality-control">
          <Sparkles size={15} aria-hidden="true" />
          <span>กราฟิก</span>
          <select
            aria-label="คุณภาพกราฟิก"
            value={quality}
            onChange={(event) => setQuality(event.target.value as GraphicsQuality)}
          >
            <option value="performance">ประหยัด</option>
            <option value="balanced">สมดุล</option>
            <option value="cinematic">สูง</option>
          </select>
        </label>
        <button
          className="scene-control lantern-control"
          type="button"
          aria-label="ปล่อยโคมลอย"
          title="ปล่อยโคมลอย"
          onClick={() => {
            setExtraSkyLanterns((current) => Math.min(current + 1, 20))
            setMessage(extraSkyLanterns >= 20 ? 'ท้องฟ้ามีโคมลอยเต็มแล้ว ✨' : 'ปล่อยโคมลอยขึ้นสู่ท้องฟ้าแล้ว ✨')
          }}
        >
          <Flame size={16} /> <span>ปล่อยโคม</span>
        </button>
        <button
          className={`scene-control${freeCamera ? ' is-active' : ''}`}
          type="button"
          aria-pressed={freeCamera}
          aria-label={freeCamera ? 'ออกจากโหมดสำรวจอิสระ' : 'เปิดโหมดสำรวจอิสระ'}
          title={freeCamera ? 'ออกจากโหมดสำรวจอิสระ' : 'เปิดโหมดสำรวจอิสระ'}
          onClick={() => {
            setCameraKeys([])
            setFreeCamera((active) => !active)
          }}
        >
          <Camera size={16} /> <span>{freeCamera ? 'ปิดโหมดสำรวจ' : 'สำรวจอิสระ'}</span>
        </button>
        {freeCamera && (
          <button
            className="scene-control reset-camera-control"
            type="button"
            aria-label="รีเซ็ตมุมกล้อง"
            title="รีเซ็ตมุมกล้อง"
            onClick={() => setCameraResetToken((token) => token + 1)}
          >
            <RotateCcw size={16} /> <span>รีเซ็ตมุมกล้อง</span>
          </button>
        )}
        <button
          className="scene-control firework-control"
          type="button"
          aria-label="จุดพลุ"
          title="จุดพลุ"
          onClick={() => {
            const id = ++fireworkId.current
            const burst: FireworkBurstData = {
              id,
              x: 15 + Math.random() * 6,
              y: 8.3 + Math.random() * 1.1,
              z: -7.5 + Math.random() * 2,
              hue: 0.04 + Math.random() * 0.14,
            }
            setFireworks((current) => [...current, burst].slice(-3))
            window.setTimeout(() => setFireworks((current) => current.filter((item) => item.id !== id)), 8500)
            setMessage('ขอให้แสงพลุนำพาความสุขมาให้ ✨')
          }}
        >
          <PartyPopper size={16} /> <span>จุดพลุ</span>
        </button>
      </nav>
      {freeCamera && (
        <div className="camera-hint" role="status">
          <Move3D size={14} /> WASD / ลูกศร เดิน · Shift วิ่ง · Q/E ขึ้นลง · ลากหมุน
        </div>
      )}
      {freeCamera && (
        <div className="mobile-camera-pad" aria-label="ปุ่มเดินสำหรับจอสัมผัส">
          <button type="button" aria-label="เดินหน้า" aria-pressed={cameraKeys.includes('w')} onPointerDown={holdCameraKey('w')} onPointerUp={releaseCameraKey('w')} onPointerCancel={releaseCameraKey('w')} onPointerLeave={releaseCameraKey('w')}><ArrowUp size={19} /></button>
          <button type="button" aria-label="เดินซ้าย" aria-pressed={cameraKeys.includes('a')} onPointerDown={holdCameraKey('a')} onPointerUp={releaseCameraKey('a')} onPointerCancel={releaseCameraKey('a')} onPointerLeave={releaseCameraKey('a')}><ArrowLeft size={19} /></button>
          <button type="button" aria-label="ถอยหลัง" aria-pressed={cameraKeys.includes('s')} onPointerDown={holdCameraKey('s')} onPointerUp={releaseCameraKey('s')} onPointerCancel={releaseCameraKey('s')} onPointerLeave={releaseCameraKey('s')}><ArrowDown size={19} /></button>
          <button type="button" aria-label="เดินขวา" aria-pressed={cameraKeys.includes('d')} onPointerDown={holdCameraKey('d')} onPointerUp={releaseCameraKey('d')} onPointerCancel={releaseCameraKey('d')} onPointerLeave={releaseCameraKey('d')}><ArrowRight size={19} /></button>
        </div>
      )}

      <main id="home" className="main-content">
        <section className="intro-copy" aria-labelledby="page-title">
          <div className="eyebrow"><span className="eyebrow-line" /> FESTIVAL OF LIGHTS <span>·</span> THAILAND</div>
          <h1 id="page-title">คืนแสงจันทร์<br /><em>ลอยไปกับสายน้ำ</em></h1>
          <p className="intro-description">
            ฝากคำอธิษฐานไว้กับกระทงดอกไม้ แล้วปล่อยให้แสงเล็ก ๆ พาความหวังของคุณเดินทางไป
          </p>
          <button className="text-link" type="button" onClick={focusWishInput}>
            ปล่อยกระทงของคุณ <ArrowDown size={16} />
          </button>
          <div className="intro-note"><MoonStar size={15} /> ใต้แสงจันทร์ ในคืนวันเพ็ญ</div>
        </section>

        <aside className="wish-card" aria-labelledby="wish-title">
          <div className="card-topline"><span><Sparkles size={15} /> YOUR WISH</span><span className="step-count">01 <i /> 01</span></div>
          <h2 id="wish-title">ส่งคำอธิษฐาน<br />ไปกับสายน้ำ</h2>
          <p className="card-description">ใส่ชื่อของคุณลงบนกระทง แล้วปล่อยให้ลอยไปในค่ำคืนนี้</p>
          <form onSubmit={releaseWish}>
            <label htmlFor="wish-name">ชื่อบนกระทง</label>
            <div className="input-wrap">
              <Heart size={16} aria-hidden="true" />
              <input
                ref={nameInput}
                id="wish-name"
                name="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="พิมพ์ชื่อของคุณที่นี่"
                maxLength={16}
                autoComplete="name"
                aria-describedby="name-help"
              />
              <span className="character-count">{name.length}/16</span>
            </div>
            <div id="name-help" className="input-help">ชื่อจะปรากฏบนกระทงของคุณ</div>
            <button className="release-button" type="submit">
              <span>ลอยกระทง</span><span className="button-icon"><Send size={16} /></span>
            </button>
          </form>
          <div className="wish-message" aria-live="polite">{message || <span><span className="tiny-star">✦</span> ขอให้คำอธิษฐานของคุณเป็นจริง</span>}</div>
        </aside>
      </main>

      <footer className="bottom-bar">
        <div className="tradition-note"><span className="footer-seal"><MoonStar size={17} /></span><span><strong>ประเพณีแห่งการขอบคุณสายน้ำ</strong><small>หนึ่งคำอธิษฐาน · หนึ่งแสงแห่งความหวัง</small></span></div>
        <div className="drag-note"><span className="drag-orbit"><Move3D size={14} /></span> ลากเพื่อหมุนชมบรรยากาศ</div>
        <div className="year-note">LOI KRATHONG <span>—</span> 2026</div>
      </footer>
    </div>
  )
}

export default App

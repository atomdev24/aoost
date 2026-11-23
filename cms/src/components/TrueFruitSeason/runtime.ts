// @ts-nocheck -- lifted as-is from the Framer component (written without the strict index checks this project uses).
// The TrueFruit season section's script (from the Framer component, unchanged apart from the boot at the end).
// Bundled as /assets/truefruit.js and loaded only on pages that use the block.

/** Port of Products.astro script, scoped to one root element. Returns a cleanup function. */
function initSeason(
    root: HTMLElement,
    opts: {
        header: number
        canvas: boolean
        canvasStage: number
        fixed: boolean
        zoom: () => number
    }
) {
    const track = root.querySelector(".season-track") as HTMLElement
    const season = track.querySelector(".season") as HTMLElement
    const timeline = season.querySelector(".timeline") as HTMLElement
    const tabs = [...timeline.querySelectorAll<HTMLElement>(".timeline-tab")]
    const stages = [...season.querySelectorAll<HTMLElement>(".stage")]
    const insights = stages.map(
        (s) => s.querySelector(".insights") as HTMLElement
    )
    const growth = timeline.querySelector(".growth") as SVGSVGElement
    const chip = timeline.querySelector(".growth-chip") as HTMLElement
    const fruit = growth.querySelector(".growth-fruit")!
    const ripe = growth.querySelector(".growth-ripe")!
    const clip = growth.querySelector(".growth-behind-clip")!
    const stops = [...growth.querySelectorAll(".growth-stop")]
    const leaf = growth.querySelector(".growth-leaf")!
    const bins = [...growth.querySelectorAll(".growth-bin")]
    const binFruit = growth.querySelector(".growth-bin-fruit")!
    const binCrate = growth.querySelector(".growth-bin-crate")!

    const mq = window.matchMedia("(min-width: 961px)")
    // In "Scale desktop layout" mode the desktop layout is used at every screen size.
    const desktop = {
        get matches() {
            return opts.fixed || mq.matches
        },
    }
    const runway = track.querySelector(".season-runway") as HTMLElement
    const Z = () => opts.zoom() || 1
    const rectH = (el: Element) => el.getBoundingClientRect().height
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    const last = stages.length - 1
    let active = 0
    let revealed = opts.canvas

    const setActive = (idx: number, force = false) => {
        if (idx === active && !force) return
        active = idx
        tabs.forEach((tab, n) => {
            const on = idx === n
            tab.setAttribute("aria-selected", String(on))
            tab.tabIndex = on ? 0 : -1
            stages[n].classList.toggle("is-active", on)
            ;(stages[n] as any).inert = desktop.matches && !on
            if (revealed && (on || desktop.matches))
                insights[n].classList.toggle("is-shown", on)
        })
    }

    // ---- growth line / fruit animation ----
    const BIN = { landingX: 32, landingY: 24, landingRadius: 8, halfWidth: 27 }
    const SIZES = [10, 65, 70]
    const sizeAt = (p: number) => {
        const second = p >= 0.5
        const t = second ? p * 2 - 1 : p * 2
        const [a, b] = second ? SIZES.slice(1) : SIZES
        const [up, down] = second ? [5, 0] : [0, 5]
        return (
            a +
            (b - a) * t * t * (3 - 2 * t) +
            up * t * (1 - t) ** 2 -
            down * t * t * (1 - t)
        )
    }
    const smooth = (x: number) => {
        const t = Math.min(Math.max(x, 0), 1)
        return t * t * (3 - 2 * t)
    }
    const ripeAt = (p: number) => smooth((p - 0.1) / 0.4)
    const landAt = (p: number) => smooth((p - 0.8) / 0.2)

    let G: any = null
    const measure = () => {
        const z = Z()
        const gr = growth.getBoundingClientRect()
        if (!gr.width) return false
        const box = {
            width: gr.width / z,
            height: gr.height / z,
            left: gr.left / z,
        }
        const unit = box.height / 5.5
        const r0 = unit * 0.45
        const landR = unit * 0.55
        const binScale = landR / BIN.landingRadius
        const binHalf = BIN.halfWidth * binScale
        const lineY = unit * 1.7 + 6 + chip.getBoundingClientRect().height / z
        const xAt = (p: number) =>
            p < 0.5
                ? r0 + p * 2 * (box.width / 2 - r0)
                : box.width / 2 + (p * 2 - 1) * (box.width / 2 - binHalf)
        const norm = (s: number) => (s - SIZES[0]) / (SIZES[2] - SIZES[0])
        G = {
            x: xAt,
            lineY,
            left: box.left - timeline.getBoundingClientRect().left / z,
            radiusFor: (s: number) => r0 + norm(s) * (unit - r0),
            landingRadius: landR,
            hop: unit * 0.4,
        }
        growth.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`)
        const tf = `translate(${xAt(1)} ${lineY}) scale(${binScale}) translate(${-BIN.landingX} ${-BIN.landingY})`
        bins.forEach((b) => b.setAttribute("transform", tf))
        growth
            .querySelectorAll(".growth-line")
            .forEach((l) =>
                l.setAttribute("d", `M${xAt(0)} ${lineY}H${xAt(1)}`)
            )
        stops.forEach((s, i) => {
            s.setAttribute("cx", String(xAt(i / 2)))
            s.setAttribute("cy", String(lineY))
        })
        clip.setAttribute("height", String(box.height))
        return true
    }
    const render = (p: number) => {
        if (!G) return
        const size = sizeAt(p)
        const land = landAt(p)
        const r = G.radiusFor(size)
        const rad = r + (G.landingRadius - r) * land
        const x = G.x(p)
        const y = G.lineY - Math.sin(Math.PI * land) * G.hop
        fruit.setAttribute(
            "transform",
            `translate(${x} ${y}) scale(${rad / 10})`
        )
        ripe.setAttribute("opacity", String(ripeAt(p)))
        leaf.setAttribute("opacity", String(1 - land))
        binFruit.setAttribute("opacity", String(land))
        binCrate.setAttribute("opacity", String(0.55 + 0.45 * land))
        clip.setAttribute("width", String(x))
        stops.forEach((s, i) =>
            s.classList.toggle("is-reached", p >= i / 2 - 0.01)
        )
        chip.textContent = `${Math.round(size)}mm`
        const z = Z()
        const cw = chip.getBoundingClientRect().width / z
        const tw = timeline.getBoundingClientRect().width / z
        const cx = Math.min(Math.max(G.left + x - cw / 2, 0), tw - cw)
        chip.style.transform = `translateX(${cx}px)`
    }

    // critically damped spring towards the target progress
    const K = 3.5
    let pos = 0,
        target = 0,
        vel = 0,
        raf = 0,
        lastT = 0
    const step = (now: number) => {
        const dt = Math.min(Math.max((now - lastT) / 1000, 0), 1 / 30)
        lastT = now
        vel += (K ** 2 * (target - pos) - 2 * K * vel) * dt
        pos += vel * dt
        const done = Math.abs(target - pos) < 1e-4 && Math.abs(vel) < 0.001
        if (done) pos = target
        render(pos)
        raf = done ? 0 : requestAnimationFrame(step)
    }
    const goTo = (p: number) => {
        if (p === target) return
        target = p
        if (reduce.matches || opts.canvas) {
            pos = p
            vel = 0
            return render(p)
        }
        if (!raf) {
            lastT = performance.now()
            raf = requestAnimationFrame(step)
        }
    }

    // ---- scroll linking ----
    let linked = false
    const slots = stages.length + 1
    const visible = () => season.offsetParent !== null && rectH(season) > 0
    const range = () => ({
        start:
            track.getBoundingClientRect().top +
            window.scrollY -
            (parseFloat(getComputedStyle(season).top) || 0) * Z(),
        length: rectH(track) - rectH(season),
    })
    const indexFromScroll = () => {
        const { start, length } = range()
        if (length <= 0) return 0
        return Math.min(
            Math.floor(
                Math.min(Math.max((window.scrollY - start) / length, 0), 1) *
                    slots
            ),
            last
        )
    }
    const timelineBottom = () =>
        (parseFloat(getComputedStyle(timeline).top) || 0) +
        timeline.offsetHeight
    const indexFromStack = () => {
        const mid = (timelineBottom() + window.innerHeight) / 2
        let idx = 0
        stages.forEach((s, i) => {
            if (s.getBoundingClientRect().top < mid) idx = i
        })
        return idx
    }
    const onScroll = () => {
        if (opts.canvas || !visible()) return
        if (!linked && desktop.matches) return
        const idx = linked ? indexFromScroll() : indexFromStack()
        setActive(idx)
        goTo(idx / last)
    }
    const layout = () => {
        if (!visible()) {
            linked = false
            track.classList.remove("is-scroll-linked")
            return
        }
        const stagesEl = season.querySelector(".stages") as HTMLElement
        stagesEl.style.removeProperty("zoom")
        measure()
        render(pos)
        let h = rectH(season)
        // On short screens (e.g. a 13" laptop) the pinned panel is taller than the space under the header,
        // which is what cut the bottom off. Shrink the product panel to fit (down to 70%) instead.
        const avail = window.innerHeight - opts.header - 16
        if (!opts.canvas && desktop.matches && h > avail) {
            const sh = rectH(stagesEl)
            const z = (sh - (h - avail)) / sh
            if (z >= 0.7) {
                stagesEl.style.setProperty(
                    "zoom",
                    String(Math.floor(z * 1000) / 1000)
                )
                h = rectH(season)
            }
        }
        // Only pin the panel when it fits under the header; otherwise it scrolls normally and the tabs switch products.
        linked = !opts.canvas && desktop.matches && h <= avail + 0.5
        season.style.setProperty("--season-height", `${h / Z()}px`)
        track.classList.toggle("is-scroll-linked", linked)
        if (opts.fixed && linked) {
            // 100vh inside a scaled element is scaled too, so place the pinned panel in real screen pixels
            const z = Z()
            season.style.top = `${(opts.header + Math.max(8, (window.innerHeight - opts.header - h) / 2)) / z}px`
            season.style.minHeight = "0px"
            runway.style.height = `${(1.8 * window.innerHeight) / z}px`
        } else {
            season.style.removeProperty("top")
            season.style.removeProperty("min-height")
            runway.style.removeProperty("height")
        }
        stages.forEach(
            (s, i) => ((s as any).inert = desktop.matches && i !== active)
        )
        if (linked || !desktop.matches) onScroll()
        else goTo(active / last)
    }

    // ---- wheel stepping: one notch = one product while pinned ----
    const scrollTarget = (i: number) => {
        const { start, length } = range()
        return start + ((i + 0.02) / slots) * length
    }
    const jump = (y: number) =>
        window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior })
    const W = {
        mode: "outside",
        lastTime: 0,
        lastSize: 0,
        lockedUntil: 0,
        travel: 0,
    }
    const onWheel = (e: WheelEvent) => {
        if (!linked || e.ctrlKey || !e.deltaY || !visible()) return
        const now = performance.now()
        const size = Math.abs(e.deltaY)
        const fresh =
            now - W.lastTime > 150 ||
            (now > W.lockedUntil && size > W.lastSize * 1.6 + 4)
        W.lastTime = now
        W.lastSize = size
        const { start, length } = range()
        if (
            window.scrollY < start - 1 ||
            window.scrollY >= start + length - 1
        ) {
            W.mode = "outside"
            return
        }
        if (!fresh && W.mode === "released") return
        let dir = fresh ? Math.sign(e.deltaY) : 0
        if (!fresh && W.mode === "stepping") {
            e.preventDefault()
            if (now < W.lockedUntil) return
            W.travel += e.deltaY
            if (Math.abs(W.travel) < 300) return
            dir = Math.sign(W.travel)
        }
        const next = active + dir
        if (next < 0 || next > last) {
            W.mode = "released"
            if (next > last) jump(start + length)
        } else {
            e.preventDefault()
            W.mode = "stepping"
            W.lockedUntil = now + 700
            W.travel = 0
            jump(scrollTarget(next))
        }
    }

    const select = (i: number) => {
        if (opts.canvas) return
        if (!desktop.matches) {
            const y =
                stages[i].getBoundingClientRect().top +
                window.scrollY -
                timelineBottom() -
                16
            return window.scrollTo({
                top: y,
                behavior: reduce.matches ? "auto" : "smooth",
            })
        }
        if (!linked) {
            setActive(i)
            return goTo(i / last)
        }
        const { start, length } = range()
        const pinned =
            window.scrollY >= start - 1 && window.scrollY <= start + length + 1
        if (!pinned) {
            // Section isn't pinned yet: switch the product in place instead of scrolling the page
            setActive(i)
            return goTo(i / last)
        }
        // Pinned: jump to that product's spot instantly. The panel stays still, so nothing visibly moves.
        jump(scrollTarget(i))
    }
    const tabHandlers = tabs.map((tab, i) => {
        const click = () => select(i)
        const key = (e: KeyboardEvent) => {
            const d = ({ ArrowLeft: -1, ArrowRight: 1 } as any)[e.key]
            if (!d) return
            const j = (i + d + tabs.length) % tabs.length
            select(j)
            tabs[j].focus()
        }
        tab.addEventListener("click", click)
        tab.addEventListener("keydown", key)
        return () => {
            tab.removeEventListener("click", click)
            tab.removeEventListener("keydown", key)
        }
    })

    // Reveal the chart animations (bars grow, lines draw) when the panel scrolls into view.
    let io: IntersectionObserver | null = null
    const reveal = () => {
        revealed = true
        insights.forEach((el, n) =>
            el.classList.toggle("is-shown", n === active)
        )
    }
    if (opts.canvas) {
        insights.forEach((el) => el.classList.add("is-shown"))
    } else if ("IntersectionObserver" in window) {
        io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    reveal()
                    io?.disconnect()
                }
            },
            { threshold: 0.3 }
        )
        io.observe(insights[0])
    } else reveal()

    if (opts.canvas) {
        const i = Math.min(Math.max(opts.canvasStage, 0), last)
        setActive(i, true)
        measure()
        pos = target = i / last
        render(pos)
    }

    layout()
    const ro = new ResizeObserver(() => layout())
    ro.observe(season)
    window.addEventListener("resize", layout)
    if (!opts.canvas) {
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("wheel", onWheel, { passive: false })
    }
    return () => {
        ro.disconnect()
        io?.disconnect()
        cancelAnimationFrame(raf)
        window.removeEventListener("resize", layout)
        window.removeEventListener("scroll", onScroll)
        window.removeEventListener("wheel", onWheel)
        tabHandlers.forEach((off) => off())
    }
}

function boot() {
  document.querySelectorAll<HTMLElement>(".tfs[data-tfs]").forEach((root) => {
    if (root.dataset.tfsReady) return;
    root.dataset.tfsReady = "1";
    const fixed = root.dataset.layout === "scale";
    const design = Number(root.dataset.designWidth) || 1200;
    const outer = root.parentElement!;
    let zoom = 1;
    let off: (() => void) | null = null;
    const start = () => {
      off?.();
      off = initSeason(root, { header: Number(root.dataset.header) || 0, canvas: false, canvasStage: 0, fixed, zoom: () => zoom });
    };
    if (fixed) {
      // Scale desktop: draw at the design width and shrink to fit the space.
      const fit = () => {
        const w = outer.getBoundingClientRect().width;
        const z = w > 0 ? Math.min(1, Math.round((w / design) * 10000) / 10000) : 1;
        if (z === zoom && root.style.width) return;
        zoom = z;
        root.style.width = z < 1 ? `${design}px` : "100%";
        (root.style as CSSStyleDeclaration & { zoom: string }).zoom = z < 1 ? String(z) : "";
        start();
      };
      new ResizeObserver(fit).observe(outer);
      fit();
    } else start();
  });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

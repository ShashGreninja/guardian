/**
 * Opening moment: the shield engraves itself while a counter arms it, then
 * the screen splits open. Pure CSS, shown once per browser session.
 */
export function Intro() {
  return (
    <>
      <script
        // Runs before paint so returning visitors never see the overlay flash.
        dangerouslySetInnerHTML={{
          __html:
            "try{if(sessionStorage.getItem('guardian-intro')){document.documentElement.dataset.introSeen=''}else{sessionStorage.setItem('guardian-intro','1')}}catch(e){}",
        }}
      />
      <div className="intro pointer-events-none fixed inset-0 z-[100]" aria-hidden>
        <div className="intro-top absolute inset-x-0 top-0 h-1/2 bg-void" />
        <div className="intro-bottom absolute inset-x-0 bottom-0 h-1/2 bg-void" />
        <div className="intro-core absolute inset-0 grid place-items-center">
          {/* Rosette and counter share one grid cell, so the number sits dead centre. */}
          <div className="grid size-[min(70vw,22rem)] place-items-center">
            <div className="rosette col-start-1 row-start-1 size-full text-fg/10" />
            <div className="intro-engrave col-start-1 row-start-1 size-full" />
            <div className="col-start-1 row-start-1 grid place-items-center gap-1 rounded-full bg-void px-6 py-5">
              <span className="font-display text-5xl font-extrabold tabular-nums [font-variation-settings:'wdth'_75]">
                <span className="intro-count" />
                <span className="text-fg-mute">%</span>
              </span>
              <span className="hud text-fg-soft">Arming shield</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

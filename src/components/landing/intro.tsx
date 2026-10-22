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
        <div className="intro-core absolute inset-0 grid place-content-center justify-items-center gap-8">
          <div className="relative size-[min(62vw,20rem)]">
            <div className="rosette absolute inset-0 text-fg/10" />
            <div className="intro-engrave absolute inset-0" />
          </div>
          <p className="hud text-fg-soft">
            Arming shield <span className="intro-count text-scan" />%
          </p>
        </div>
      </div>
    </>
  );
}

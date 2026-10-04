/** Explicit resume after interruption; resizing never resets the round. */
export function createLifecycle(onChange=()=>{}) {
  let started=false,paused=true,dialogOpen=false,interrupted=false,dialogWasPaused=true,reason='시작 전';
  const notify=()=>onChange({started,paused,dialogOpen,reason});
  return {
    start(){started=true;paused=false;reason='';notify();},
    pause(value,why='사용자 일시정지'){if(!started)return;paused=!!value;reason=paused?why:'';notify();},
    interrupt(why){if(!started)return;interrupted=true;paused=true;reason=why;notify();},
    openDialog(){if(dialogOpen)return;dialogWasPaused=paused;interrupted=false;dialogOpen=true;paused=true;notify();},
    closeDialog(){if(!dialogOpen)return;dialogOpen=false;paused=!started||dialogWasPaused||interrupted;if(!paused)reason='';notify();},
    get paused(){return paused;},get started(){return started;},get dialogOpen(){return dialogOpen;},get reason(){return reason;}
  };
}

import{a as o,f as t,h as r,_ as a,l as s}from"./index-T6Dm6rj4.js";import{P as l}from"./page-1Z_pnOn2.js";const n=()=>(o.managers.appStateManager.pushToState("authState",{_:"authStateSignedIn"}),t.requestedServerLanguage||t.getCacheLangPack().then(e=>{e.local&&t.getLangPack(e.lang_code)}),i.pageEl.style.display="",r(),Promise.all([a(()=>import("./appDialogsManager-2HalUxkY.js"),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14]),import.meta.url),s(),"requestVideoFrameCallback"in HTMLVideoElement.prototype?Promise.resolve():a(()=>import("./requestVideoFrameCallbackPolyfill-GsYXQx88.js"),__vite__mapDeps([]),import.meta.url)]).then(([e])=>{e.default.start(),setTimeout(()=>{document.getElementById("auth-pages").remove()},1e3)})),i=new l("page-chats",!1,n);export{i as default};
//# sourceMappingURL=pageIm-Gc2__ht6.js.map
function __vite__mapDeps(indexes) {
  if (!__vite__mapDeps.viteFileDeps) {
    __vite__mapDeps.viteFileDeps = ["./appDialogsManager-2HalUxkY.js","./avatar-_sCorh-u.js","./button-o6D6SyIk.js","./index-T6Dm6rj4.js","./index-TgDMmGqu.css","./page-1Z_pnOn2.js","./wrapEmojiText-ToxNezgb.js","./scrollable-zXvDPQUP.js","./putPreloader-NwL2z2zd.js","./htmlToSpan-Tr4IVQal.js","./countryInputField-Ag0HBXQ3.js","./textToSvgURL-Z4O-nL1S.js","./fastBlur-iN9VGk7U.js","./codeInputField--G4HYOWf.js","./appDialogsManager-ZAqcM05i.css"]
  }
  return indexes.map((i) => __vite__mapDeps.viteFileDeps[i])
}
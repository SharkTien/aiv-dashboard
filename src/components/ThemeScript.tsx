export default function ThemeScript() {
  const code = `(()=>{
    try{
      const root=document.documentElement;
      const key='themeMode';
      const mq=window.matchMedia('(prefers-color-scheme: dark)');
      const apply=()=>{
        const mode=localStorage.getItem(key)||'system';
        let dark;
        if(mode==='light')dark=false;
        else if(mode==='dark')dark=true;
        else dark=mq.matches;
        
        // Remove existing dark class first, then add if needed
        root.classList.remove('dark');
        if(dark){
          root.classList.add('dark');
        }
      };
      apply();
      mq.addEventListener('change',apply);
    }catch(e){
      console.error('Theme script error:',e);
    }
  })();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}



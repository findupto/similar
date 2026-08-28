import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'wire-menu-enhancements',
    transform(code,id){
      const normalized=id.replaceAll('\\\\','/');
      if(!normalized.endsWith('/src/main.jsx')) return null;
      let out=code;
      out="import { ProductsBulk } from './ProductsBulk.jsx';\nimport { EnhancedPOS } from './posEnhancements.jsx';\n"+out;
      out=out.replace("case'POS':return<POS state={state} setState={setState} user={user}/>","case'POS':return<EnhancedPOS state={state} setState={setState} user={user}/>");
      out=out.replace("case'Products':return<Products state={state} setState={setState} user={user}/>","case'Products':return<ProductsBulk state={state} setState={setState} user={user}/>");
      return {code:out,map:null};
    }
  }]
});

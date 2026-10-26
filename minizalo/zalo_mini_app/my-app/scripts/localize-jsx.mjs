// Translate rendered text only. Never rewrite input values, IDs or API payloads.
export default function localizeJsx({types:t}){
  return {visitor:{Program:{enter(p,state){state.localizeId=p.scope.generateUidIdentifier('translateUi');state.localizeUsed=false;},exit(p,state){if(state.localizeUsed)p.unshiftContainer('body',t.importDeclaration([t.importSpecifier(state.localizeId,t.identifier('translate'))],t.stringLiteral('@/i18n')));}},
    JSXText(p,state){
      const lines=p.node.value.replace(/\r/g,'').split('\n');let value='';
      let last=0;for(let i=0;i<lines.length;i++)if(/[^ \t]/.test(lines[i]))last=i;
      lines.forEach((line,i)=>{let text=line.replace(/\t/g,' ');if(i!==0)text=text.replace(/^ +/,'');if(i!==lines.length-1)text=text.replace(/ +$/,'');if(text){value+=text;if(i!==last)value+=' ';}});
      if(!value.trim())return;
      state.localizeUsed=true;
      p.replaceWith(t.jsxExpressionContainer(t.callExpression(state.localizeId,[t.stringLiteral(value)])));
      p.skip();
    },
    JSXExpressionContainer(p,state){
      if(t.isJSXEmptyExpression(p.node.expression))return;
      const parent=p.parentPath;
      if(parent.isJSXAttribute()&&!['title','placeholder','aria-label','alt'].includes(parent.node.name.name))return;
      if(!(parent.isJSXElement()||parent.isJSXFragment()||parent.isJSXAttribute()))return;
      if(t.isCallExpression(p.node.expression)&&p.node.expression.callee.name===state.localizeId.name)return;
      state.localizeUsed=true;
      p.node.expression=t.callExpression(state.localizeId,[p.node.expression]);
    },
    JSXAttribute(p,state){if(['title','placeholder','aria-label','alt'].includes(p.node.name.name)&&t.isStringLiteral(p.node.value)){state.localizeUsed=true;p.node.value=t.jsxExpressionContainer(t.callExpression(state.localizeId,[p.node.value]));}}
  }};
}

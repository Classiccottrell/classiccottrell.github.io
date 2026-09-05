const n={title:"Molecules/Art Card"},c=()=>`
  <section class="art-entry">
    <div class="art-visual-wrapper bg-white">
      <div class="art-visual" style="background-image: url('img/gents-lg.png'); background-color: #eee;"></div>
    </div>
    <div class="art-content">
      <blockquote class="art-quote rosarivo-regular">
        “You’re embarrassing yourself here lads. Kids stab, girls shoot, boys punch. Grown-ups fight with their heads.”
      </blockquote>
      <div class="art-details red-hat">
        <div class="detail-row">
          <span class="detail-label">Film</span>
          <span class="detail-value">The Gentlemen</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Director</span>
          <span class="detail-value">Guy Ritchie</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Character</span>
          <span class="detail-value">Ray</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Run Time</span>
          <span class="detail-value">1h 53m</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Actor</span>
          <span class="detail-value">Charlie Hunnam</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Year</span>
          <span class="detail-value">2019</span>
        </div>
      </div>
    </div>
  </section>
`,a=()=>c(),s=()=>`
  <div data-theme="brutal">
    ${c()}
  </div>
`;var e,l,r;a.parameters={...a.parameters,docs:{...(e=a.parameters)==null?void 0:e.docs,source:{originalSource:"() => cardMarkup()",...(r=(l=a.parameters)==null?void 0:l.docs)==null?void 0:r.source}}};var t,i,d;s.parameters={...s.parameters,docs:{...(t=s.parameters)==null?void 0:t.docs,source:{originalSource:`() => \`
  <div data-theme="brutal">
    \${cardMarkup()}
  </div>
\``,...(d=(i=s.parameters)==null?void 0:i.docs)==null?void 0:d.source}}};const o=["Default","BrutalTheme"];export{s as BrutalTheme,a as Default,o as __namedExportsOrder,n as default};

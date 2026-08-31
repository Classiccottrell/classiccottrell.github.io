export default {
    title: 'Atoms/Colors',
};

const ColorBlock = (name, variable) => `
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
    <div style="width: 50px; height: 50px; background-color: var(${variable}); border: 1px solid #ccc; border-radius: 8px;"></div>
    <div>
      <strong>${name}</strong><br/>
      <code>${variable}</code>
    </div>
  </div>
`;

export const Palette = () => `
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
    <div>
      <h3>Brand</h3>
      ${ColorBlock('Primary', '--brand-primary')}
      ${ColorBlock('Primary Hover', '--brand-primary-hover')}
      ${ColorBlock('Primary Active', '--brand-primary-active')}
      ${ColorBlock('Accent', '--brand-accent')}
    </div>
    <div>
      <h3>Neutrals</h3>
      ${ColorBlock('Neutral 50', '--neutral-50')}
      ${ColorBlock('Neutral 100', '--neutral-100')}
      ${ColorBlock('Neutral 200', '--neutral-200')}
      ${ColorBlock('Neutral 300', '--neutral-300')}
      ${ColorBlock('Neutral 400', '--neutral-400')}
      ${ColorBlock('Neutral 500', '--neutral-500')}
      ${ColorBlock('Neutral 600', '--neutral-600')}
      ${ColorBlock('Neutral 700', '--neutral-700')}
      ${ColorBlock('Neutral 800', '--neutral-800')}
      ${ColorBlock('Neutral 900', '--neutral-900')}
    </div>
    <div>
      <h3>Brand (tokens)</h3>
      ${ColorBlock('Brand', '--brand')}
      ${ColorBlock('Brand Deep', '--brand-deep')}
      ${ColorBlock('Brand Bright', '--brand-bright')}
      ${ColorBlock('Destructive', '--destructive')}
      ${ColorBlock('Accent Surface', '--accent-surface')}
    </div>
    <div>
      <h3>Surface</h3>
      ${ColorBlock('Paper', '--paper')}
      ${ColorBlock('Surface', '--surface')}
      ${ColorBlock('Bg Page', '--bg-page')}
      ${ColorBlock('Line', '--line')}
    </div>
    <div>
      <h3>Ink / Text</h3>
      ${ColorBlock('Ink', '--ink')}
      ${ColorBlock('Ink Soft', '--ink-soft')}
      ${ColorBlock('Ink Mute', '--ink-mute')}
      ${ColorBlock('Text Main', '--text-main')}
      ${ColorBlock('Text Secondary', '--text-secondary')}
      ${ColorBlock('Text Footer', '--text-footer')}
      ${ColorBlock('Text Copyright', '--text-copyright')}
    </div>
  </div>
`;

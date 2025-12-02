export default {
    title: 'Atoms/Typography',
};

export const Headings = () => `
  <h1 class="headline">Headline Text (42px)</h1>
  <p class="subtext">Subtext (14px, Secondary Color)</p>
`;

export const Fonts = () => `
  <div style="display: flex; flex-direction: column; gap: 20px;">
    <div>
      <p class="rosarivo-regular" style="font-size: 24px;">Rosarivo Regular</p>
      <code>.rosarivo-regular</code>
    </div>
    <div>
      <p class="rosarivo-regular-italic" style="font-size: 24px;">Rosarivo Italic</p>
      <code>.rosarivo-regular-italic</code>
    </div>
    <div>
      <p class="red-hat" style="font-size: 24px;">Red Hat Display</p>
      <code>.red-hat</code>
    </div>
  </div>
`;

export default {
    title: 'Molecules/Art Card',
};

export const Default = () => `
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
          <span class="detail-label">Year</span>
          <span class="detail-value">2019</span>
        </div>
      </div>
    </div>
  </section>
`;

// wwwroot/ts/custom-background.ts
function addCustomBackground(area) {
  const background = document.createElement("div");
  background.classList.add("background");
  background.classList.add("fill-area");
  area.area.content.add(background);
}
export {
  addCustomBackground
};
//# sourceMappingURL=custom-background.js.map

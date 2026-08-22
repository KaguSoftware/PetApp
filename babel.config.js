module.exports = function (api) {
  api.cache(true);
  return {
    // NOT: "babel-preset-expo" bu projede kökten resolve EDİLMİYOR — paket
    // node_modules/expo/node_modules/ altında duruyor. Expo'nun kendi
    // loadBabelConfig'i de bu yüzden `expo/internal/babel-preset` kullanıyor.
    presets: [require("expo/internal/babel-preset")],
    env: {
      production: {
        // console.error kalıyor — gerçek hatalar cihaz logunda görünsün
        plugins: [["transform-remove-console", { exclude: ["error"] }]],
      },
    },
  };
};

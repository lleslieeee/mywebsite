function loadAsset(path, placeholderPath) {
  return fetch(path)
    .then(res => {
      if (!res.ok) throw new Error("Asset missing");
      return res.blob();
    })
    .catch(() => fetch(placeholderPath).then(res => res.blob()));
}

// Example usage:
loadAsset("assets/cgs/ch1/cg01.png", "public/placeholder_cgs/placeholder_cg1.png");

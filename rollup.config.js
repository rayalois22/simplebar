export const getExternals = (pkg) => (id) => {
  if (
    Object.keys(pkg.dependencies).find(
      (dep) => id === dep && id !== 'simplebar-core'
    ) ||
    Object.keys(pkg.peerDependencies || {}).find((dep) => id === dep) ||
    id.match(/(core-js).+/) ||
    id.match(/(@babel).+/)
  ) {
    return true;
  }

  return false;
};

export const getBanner = (pkg) => ({
  banner: `
        ${pkg.name} - v${pkg.version}
        ${pkg.description}
        ${pkg.homepage}

        Made by ${pkg.author}
        Under ${pkg.license} License
      `,
});
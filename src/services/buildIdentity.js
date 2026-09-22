const BUILD_COMMIT_SHA =
  String(
    import.meta.env
      .VITE_MVX_BUILD_COMMIT_SHA ||
    ""
  )
    .trim();


function isValidBuildCommitSha(
  value
) {

  return /^[0-9a-f]{7,64}$/i
    .test(
      String(
        value || ""
      )
        .trim()
    );
}


export function getBuildCommitSha() {

  if (
    !isValidBuildCommitSha(
      BUILD_COMMIT_SHA
    )
  ) {
    throw new Error(
      "MVX build commit SHA is unavailable"
    );
  }

  return BUILD_COMMIT_SHA;
}


export {
  BUILD_COMMIT_SHA as MVX_BUILD_COMMIT_SHA,
};

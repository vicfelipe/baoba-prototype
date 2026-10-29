using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Baoba.Editor
{
    public static class BuildCommands
    {
        [MenuItem("BAOBA/Build/Windows x64")]
        public static void BuildWindows()
        {
            ContentValidator.Validate();
            var output = Path.GetFullPath(Path.Combine("Builds", "Windows", "BAOBA.exe"));
            Directory.CreateDirectory(Path.GetDirectoryName(output));
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = EditorBuildSettings.scenes.Where(scene => scene.enabled).Select(scene => scene.path).ToArray(),
                locationPathName = output,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.StrictMode
            });
            if (report.summary.result != BuildResult.Succeeded)
                throw new InvalidOperationException("BAOBA Windows build failed: " + report.summary.result);
            Debug.Log("BAOBA Windows build PASS: " + output);
        }
    }
}

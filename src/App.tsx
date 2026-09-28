// アプリ本体。画面の並びと、イラスト・設定・書き出しの状態をここで管理します。
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './App.module.css';
import { ExportPanel, type ExportResult } from './components/ExportPanel';
import { Header } from './components/Header';
import { ImageList } from './components/ImageList';
import { LivePanel } from './components/LivePanel';
import { Panel } from './components/Panel';
import { PreviewPlayer } from './components/PreviewPlayer';
import { FeverPresets, FlowControls, OutputControls, SparkleControls, TextControls } from './components/SettingsPanels';
import { BackgroundSplashes } from './components/Stickers';
import { StickyGenerateBar } from './components/StickyGenerateBar';
import { makeFileName } from './lib/download';
import { bitrateFor, detectSupport, encodeVideo } from './lib/encodeVideo';
import { isSupportedImage, loadIllustration, releaseImage } from './lib/loadImages';
import { prepareAssets, prepareBackground, renderFrame, sizeOf } from './lib/renderer';
import { buildScene } from './lib/scene';
import { makeTextArt, textInfo, toTextSources, type TextArt } from './lib/textArt';
import { DEFAULT_SETTINGS, findFeverPreset } from './presets';
import type { FlowSettings, Illustration, OutputSettings, Settings, SparkleSettings, TextSettings } from './types';

export default function App() {
  const [images, setImages] = useState<Illustration[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<Illustration | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [support, setSupport] = useState<{ webmTransparent: boolean; webm: boolean; mp4: boolean } | null>(null);

  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportInView, setExportInView] = useState(false);

  // このブラウザで作れる形式を調べる（透過 WebM が作れなければ MP4 グリーンバックに）
  useEffect(() => {
    void detectSupport().then((s) => {
      setSupport(s);
      if (!s.webmTransparent) {
        setSettings((current) => ({
          ...current,
          output: { ...current.output, format: s.webm ? 'webm' : 'mp4', background: '#00ff00' },
        }));
      }
    });
  }, []);

  // 文字の画像（フォントを読み込んでから作るので、少し遅れてできる）
  const [textArt, setTextArt] = useState<TextArt | null>(null);
  const { content: textContent, color: textColor } = settings.text;
  useEffect(() => {
    let cancelled = false;
    void makeTextArt({ content: textContent, color: textColor }).then((art) => {
      if (!cancelled) setTextArt(art);
    });
    return () => {
      cancelled = true;
    };
  }, [textContent, textColor]);
  const textSources = useMemo(() => toTextSources(textArt), [textArt]);
  const hasText = !!textArt && (settings.text.flow || settings.text.bottom !== 'off');
  const canMake = images.length > 0 || hasText;

  const { width, height } = sizeOf(settings.output.size);
  const sceneText = useMemo(() => textSources && textInfo(textSources), [textSources]);
  const scene = useMemo(() => buildScene(settings, images.length, width, height, sceneText ?? undefined), [settings, images.length, width, height, sceneText]);
  // 透過 WebM は「透明度の映像」が別に入るぶん大きくなる
  const transparentWebm = settings.output.format === 'webm' && settings.output.background === 'transparent';
  const estimatedBytes = ((bitrateFor(width, height, settings.output.fps) * scene.totalSeconds) / 8) * (transparentWebm ? 1.8 : 1);
  const activePreset = findFeverPreset(settings);

  const source = useMemo(() => ({ images, settings, backgroundImage, textArt }), [images, settings, backgroundImage, textArt]);
  const currentResult = result && result.source === source ? result : null;

  // 08 Export が見えていないときだけ、スマホで下に固定ボタンを出す
  useEffect(() => {
    const panel = document.getElementById('export');
    if (!panel) return;
    const observer = new IntersectionObserver(([entry]) => setExportInView(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  const scrollToResultRef = useRef(false);
  useEffect(() => {
    if (!scrollToResultRef.current || working) return;
    scrollToResultRef.current = false;
    document.getElementById('export')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [working, currentResult]);

  const addImages = async (files: File[]) => {
    setLoading(true);
    setNotice(null);
    const loaded: Illustration[] = [];
    const skipped: string[] = [];
    for (const file of files) {
      if (!isSupportedImage(file)) {
        skipped.push(file.name);
        continue;
      }
      try {
        loaded.push(await loadIllustration(file));
      } catch {
        skipped.push(file.name);
      }
    }
    setImages((list) => [...list, ...loaded]);
    if (skipped.length) setNotice(`読み込めなかったファイル: ${skipped.join(', ')}（PNG / JPG / WebP に対応しています）`);
    setLoading(false);
  };

  const removeImage = (id: string) => {
    setImages((list) => {
      releaseImage(list.find((i) => i.id === id) ?? null);
      return list.filter((i) => i.id !== id);
    });
  };

  const setBackgroundFile = async (file: File) => {
    if (!isSupportedImage(file)) {
      setNotice(`${file.name} は背景に使えません（PNG / JPG / WebP に対応しています）`);
      return;
    }
    try {
      const image = await loadIllustration(file);
      releaseImage(backgroundImage);
      setBackgroundImage(image);
    } catch {
      setNotice(`${file.name} を読み込めませんでした`);
    }
  };

  const removeBackground = () => {
    releaseImage(backgroundImage);
    setBackgroundImage(null);
    updateOutput({ background: '#00ff00' });
  };

  const updateFlow = (patch: Partial<FlowSettings>) => setSettings((s) => ({ ...s, flow: { ...s.flow, ...patch } }));
  const updateSparkle = (patch: Partial<SparkleSettings>) => setSettings((s) => ({ ...s, sparkle: { ...s.sparkle, ...patch } }));
  const updateText = (patch: Partial<TextSettings>) => setSettings((s) => ({ ...s, text: { ...s.text, ...patch } }));
  const updateOutput = (patch: Partial<OutputSettings>) => setSettings((s) => ({ ...s, output: { ...s.output, ...patch } }));

  const generate = async () => {
    if (!canMake || working) return;
    setWorking(true);
    setProgress(0);
    setError(null);
    try {
      const assets = {
        ...prepareAssets(images, height * settings.flow.sizeMax, { sources: textSources, phraseHeight: scene.phraseHeight }),
        background: prepareBackground(backgroundImage, width, height),
      };
      const blob = await encodeVideo(
        {
          format: settings.output.format,
          width,
          height,
          fps: settings.output.fps,
          seconds: scene.totalSeconds,
          transparent: settings.output.format === 'webm' && settings.output.background === 'transparent',
          render: (ctx, t) => renderFrame(ctx, scene, t, assets, settings),
        },
        setProgress,
      );
      if (result) URL.revokeObjectURL(result.url);
      setResult({ blob, url: URL.createObjectURL(blob), fileName: makeFileName(settings.output.format), format: settings.output.format, source });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setWorking(false);
    }
  };

  const generateFromStickyBar = () => {
    document.getElementById('export')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    scrollToResultRef.current = true;
    void generate();
  };

  return (
    <>
      <BackgroundSplashes />
      <div className={styles.app}>
        <Header />
        <main className={styles.editor}>
          <Panel id="images" title="01 Images" color="var(--cyan)">
            <ImageList images={images} loading={loading} onAdd={addImages} onRemove={removeImage} />
            {notice && (
              <p className={styles.notice} role="status">
                {notice}
              </p>
            )}
          </Panel>

          <Panel id="text" title="02 Text" color="var(--orange)" hint="文字も流せます。「わたしすげーー！！」など。1行に1つ書くと、ランダムに混ざって流れます">
            <TextControls text={settings.text} onChange={updateText} />
          </Panel>

          <Panel id="preview" title="03 Preview" color="var(--yellow)">
            <PreviewPlayer scene={scene} images={images} textSources={hasText ? textSources : null} settings={settings} backgroundImage={backgroundImage} />
          </Panel>

          <Panel id="fever" title="04 Fever" color="var(--pink)" hint="どれくらいフィーバーさせるか。選んだあと下で細かく調整できます">
            <FeverPresets
              activeId={activePreset?.id}
              onSelect={(preset) =>
                setSettings((s) => ({ ...s, flow: { ...s.flow, ...preset.flow }, sparkle: { ...s.sparkle, ...preset.sparkle } }))
              }
            />
          </Panel>

          <div className={styles.twoColumns}>
            <Panel id="flow" title="05 Flow" color="var(--lime)">
              <FlowControls flow={settings.flow} onChange={updateFlow} />
            </Panel>
            <Panel id="sparkle" title="06 Sparkle" color="var(--sky)">
              <SparkleControls sparkle={settings.sparkle} onChange={updateSparkle} />
            </Panel>
          </div>

          <Panel id="output" title="07 Output" color="var(--purple)">
            <OutputControls
              output={settings.output}
              onChange={updateOutput}
              support={support}
              totalSeconds={scene.totalSeconds}
              estimatedBytes={estimatedBytes}
              backgroundImage={backgroundImage}
              onBackgroundFile={setBackgroundFile}
              onRemoveBackground={removeBackground}
            />
          </Panel>

          <Panel id="export" title="08 Export" color="var(--orange)">
            <ExportPanel
              format={settings.output.format}
              canGenerate={canMake}
              working={working}
              progress={progress}
              result={currentResult}
              error={currentResult || working ? null : error}
              onGenerate={generate}
            />
          </Panel>

          <Panel id="live" title="09 Live" color="var(--lime)" hint="生配信モード: OBS でその場で弾幕を流す">
            <LivePanel images={images} textArt={hasText ? textArt : null} settings={settings} />
          </Panel>
        </main>

        <footer className={styles.footer}>
          <p>
            Uploaded images are processed locally in your browser and are not uploaded to a server.
            <br />
            画像はすべてお使いのブラウザ内で処理されます。
          </p>
          <p className={styles.footerSmall}>KiraDanmaku · MIT License</p>
        </footer>
      </div>

      <StickyGenerateBar
        visible={canMake && !exportInView}
        format={settings.output.format}
        working={working}
        progress={progress}
        onGenerate={generateFromStickyBar}
      />
    </>
  );
}

import React from "react";
import { Composition, Folder } from "remotion";
import { FPS, posts } from "./data";
import { Carrossel, CARROSSEL_H, CARROSSEL_W } from "./compositions/Carrossel";
import { Reel, Story, VERTICAL_H, VERTICAL_W, duracaoPost } from "./compositions/Vertical";

/**
 * Uma composição por post, gerada a partir de data/posts.json.
 *  - carrossel-<id>: 1080x1350, 1 frame por slide (use `remotion still --frame=N`)
 *  - reel-<id>:      1080x1920 @30fps, duração = soma das cenas
 *  - story-<id>:     1080x1920 @30fps, 3 cenas x ~4s
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Carrosseis">
        {posts
          .filter((p) => p.type === "carrossel")
          .map((p) => (
            <Composition
              key={p.id}
              id={`carrossel-${p.id}`}
              component={Carrossel}
              width={CARROSSEL_W}
              height={CARROSSEL_H}
              fps={1}
              durationInFrames={(p.slides ?? []).length}
              defaultProps={{ postId: p.id }}
            />
          ))}
      </Folder>
      <Folder name="Reels">
        {posts
          .filter((p) => p.type === "reel")
          .map((p) => (
            <Composition
              key={p.id}
              id={`reel-${p.id}`}
              component={Reel}
              width={VERTICAL_W}
              height={VERTICAL_H}
              fps={FPS}
              durationInFrames={duracaoPost(p)}
              defaultProps={{ postId: p.id }}
            />
          ))}
      </Folder>
      <Folder name="Stories">
        {posts
          .filter((p) => p.type === "story")
          .map((p) => (
            <Composition
              key={p.id}
              id={`story-${p.id}`}
              component={Story}
              width={VERTICAL_W}
              height={VERTICAL_H}
              fps={FPS}
              durationInFrames={duracaoPost(p)}
              defaultProps={{ postId: p.id }}
            />
          ))}
      </Folder>
    </>
  );
};

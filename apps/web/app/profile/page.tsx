"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, LoaderCircle, LogIn, RefreshCw } from "lucide-react";
import type { AuthSession, ZhihuCreatedContent, ZhihuFollowee } from "@human-api/contracts";
import {
  ApiClientError,
  getZhihuAuthUrl,
  getZhihuCreatedContents,
  getZhihuFollowees,
  getZhihuMe,
} from "@/lib/api-client";

function errorText(error: unknown): string {
  return error instanceof ApiClientError || error instanceof Error
    ? error.message
    : "加载失败，请重试。";
}

function LoadMore({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button className="load-more profile-load-more" type="button" onClick={onClick} disabled={busy}>
      {busy ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}
      {busy ? "正在加载…" : "加载更多"}
    </button>
  );
}

export default function ProfilePage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [followees, setFollowees] = useState<ZhihuFollowee[]>([]);
  const [contents, setContents] = useState<ZhihuCreatedContent[]>([]);
  const [followeeOffset, setFolloweeOffset] = useState("0");
  const [contentOffset, setContentOffset] = useState("0");
  const [followeeEnd, setFolloweeEnd] = useState(false);
  const [contentEnd, setContentEnd] = useState(false);
  const [followeeBusy, setFolloweeBusy] = useState(false);
  const [contentBusy, setContentBusy] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    getZhihuMe()
      .then((nextSession) => {
        setSession(nextSession);
        setLoading(false);
      })
      .catch((error) => {
        setAuthError(errorText(error));
        setLoading(false);
      });
  }, []);

  async function loadFollowees(reset = false) {
    setFolloweeBusy(true);
    setDataError(null);
    try {
      const response = await getZhihuFollowees(reset ? "0" : followeeOffset);
      setFollowees((items) => (reset ? response.items : [...items, ...response.items]));
      setFolloweeOffset(response.paging.nextOffset ?? followeeOffset);
      setFolloweeEnd(response.paging.isEnd);
    } catch (error) {
      setDataError(errorText(error));
    } finally {
      setFolloweeBusy(false);
    }
  }

  async function loadContents(reset = false) {
    setContentBusy(true);
    setDataError(null);
    try {
      const response = await getZhihuCreatedContents(reset ? "0" : contentOffset);
      setContents((items) => (reset ? response.items : [...items, ...response.items]));
      setContentOffset(response.paging.nextOffset ?? contentOffset);
      setContentEnd(response.paging.isEnd);
    } catch (error) {
      setDataError(errorText(error));
    } finally {
      setContentBusy(false);
    }
  }

  useEffect(() => {
    if (session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadFollowees(true);
      void loadContents(true);
    }
    // Initial authenticated load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function login() {
    try {
      const result = await getZhihuAuthUrl(`${window.location.origin}/auth/zhihu/callback`);
      window.location.assign(result.url);
    } catch (error) {
      setAuthError(errorText(error));
    }
  }

  if (loading) {
    return (
      <main className="profile-page">
        <div className="profile-state">
          <LoaderCircle className="spin" /> 正在读取登录状态…
        </div>
      </main>
    );
  }
  if (!session) {
    return (
      <main className="profile-page">
        <div className="profile-state">
          <LogIn size={24} />
          <h1>请先登录知乎</h1>
          <p>{authError ?? "登录后才能查看你的关注和创作信息。"}</p>
          <button className="primary-button" type="button" onClick={login}>
            <LogIn size={16} /> 知乎登录
          </button>
          <Link className="quiet-button" href="/">
            返回发现
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <div className="profile-container">
        <Link className="back-link" href="/">
          <ArrowLeft size={16} /> 返回发现
        </Link>
        <section className="profile-hero">
          {session.user.avatar ? (
            <img className="profile-avatar" src={session.user.avatar} alt="" />
          ) : (
            <span className="profile-avatar profile-avatar-fallback">
              {session.user.fullname.slice(0, 1)}
            </span>
          )}
          <div>
            <span className="profile-kicker">知乎已登录</span>
            <h1>{session.user.fullname}</h1>
            <p>{session.user.headline || "已连接 Human Gateway 社区"}</p>
            <small>UID · {session.user.uid}</small>
          </div>
        </section>
        {dataError ? (
          <div className="feed-error" role="alert">
            {dataError}
          </div>
        ) : null}
        <section className="profile-section">
          <div className="profile-section-heading">
            <div>
              <span className="profile-kicker">NETWORK</span>
              <h2>我关注的人</h2>
            </div>
            <span className="profile-muted">来自知乎公开关注列表</span>
          </div>
          {followees.length === 0 && followeeBusy ? (
            <div className="profile-empty">
              <LoaderCircle className="spin" /> 正在加载关注列表…
            </div>
          ) : null}
          <div className="profile-follow-grid">
            {followees.map((person) => (
              <a
                className="profile-follow-card"
                href={person.url}
                target="_blank"
                rel="noreferrer"
                key={person.urlToken}
              >
                {person.avatarUrl ? (
                  <img src={person.avatarUrl} alt="" />
                ) : (
                  <span className="profile-small-avatar">{person.fullname.slice(0, 1)}</span>
                )}
                <span>
                  <strong>{person.fullname}</strong>
                  <small>{person.headline || "知乎用户"}</small>
                </span>
                <ExternalLink size={14} />
              </a>
            ))}
          </div>
          {!followeeEnd ? (
            <LoadMore busy={followeeBusy} onClick={() => void loadFollowees()} />
          ) : null}
          {followees.length === 0 && !followeeBusy ? (
            <p className="profile-muted">暂无可展示的关注信息，或该接口暂未返回公开数据。</p>
          ) : null}
        </section>
        <section className="profile-section">
          <div className="profile-section-heading">
            <div>
              <span className="profile-kicker">CREATION</span>
              <h2>我的创作</h2>
            </div>
            <span className="profile-muted">回答、文章、想法等</span>
          </div>
          {contents.length === 0 && contentBusy ? (
            <div className="profile-empty">
              <LoaderCircle className="spin" /> 正在加载创作信息…
            </div>
          ) : null}
          <div className="profile-content-list">
            {contents.map((content) => (
              <a
                className="profile-content-card"
                href={content.url}
                target="_blank"
                rel="noreferrer"
                key={`${content.url}-${content.createdAt}`}
              >
                <div>
                  <span className="content-type">{content.contentType}</span>
                  <h3>{content.title || "未命名创作"}</h3>
                  <p>{content.summary || "打开知乎查看原文"}</p>
                </div>
                <div className="profile-content-meta">
                  <span>{content.likeCount ?? 0} 赞</span>
                  <span>{content.commentCount ?? 0} 评论</span>
                  <ExternalLink size={15} />
                </div>
              </a>
            ))}
          </div>
          {!contentEnd ? <LoadMore busy={contentBusy} onClick={() => void loadContents()} /> : null}
          {contents.length === 0 && !contentBusy ? (
            <p className="profile-muted">暂无可展示的创作信息，或该接口暂未返回公开数据。</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}

# 维护实践复盘与 GitHub Pages

公开内容以 `field-notes.md`、`test-results.md` 和 `evidence/public-test-data.json` 为源；页面是同一材料的静态阅读版，不单独维护另一套结论。

## 更新流程

1. 在本地核对原始实验：时间、清单是否缓存、系统隧道、尝试次数、状态分类、成功样本统计及未完成项。
2. 只把批准公开的白名单字段汇入测试 JSON 与 Markdown。导出脚本和包含凭据的原始记录仍在私有区，不让公共构建读取它们。不要复制原始目录、二维码、请求正文或配置。
3. 更新正文和附录的证据截止时间。维护主文表格时从同批次 JSON 核对，不把新旧地址或重叠节点样本合并。
4. 运行 `node scripts/build-field-notes.cjs`。构建需要 Node.js 与已认证的 `gh`，通过 GitHub Markdown API 渲染已脱敏文本；它只读公开材料，不遍历仓库。输出到 `site/`，无 CDN、分析脚本或第三方运行时请求。
5. 运行 `node work/test-field-notes.js`，以及受影响的规则回归；预览 `site/`，检查桌面/手机宽度、目录锚点、下载与所有公开字段。
6. 仅提交已审核文档和生成产物。发布前检查 `site/manifest.json` 及 `git ls-tree`，确保发布目录只有静态文档。其他未完成配置改动不随文档提交。
7. Pages 使用专用静态分支 `codex/field-notes-pages` 的根目录。用 `git subtree split --prefix=site` 得到静态目录提交，再正常快进推送到该分支；不强制覆盖冲突历史。Pages 源不指向仓库根目录或私有区。
8. 通过 Pages API 检查构建，并实际读取发布 URL、附录和 JSON，核对内容哈希。推送成功、Pages 构建成功与公网可访问是三项不同的证据。

本地目录中并非所有历史测试都能公开重放；JSON 保留源文件哈希以供维护者比对，公开读者能看到分母、分类及局限。当前页面不自动刷新测速数据；provider 更新也不会更新网页结论。

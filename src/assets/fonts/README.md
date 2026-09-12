# 首页 intro 字体

寒蝉全圆体 ChillRoundF v3.0，来源：https://github.com/Warren2060/ChillRound

`chill-round.woff2` 由作者的 `ChillRoundF v3.0.ttf` 转换为 WOFF2，保留完整字符集。许可见 OFL.txt。

仅主页 intro 使用，由 next/font/local 随网站托管；无需请求 Google Fonts。

页面实际加载 `chill-round-intro.woff2`，仅含中英文 `home.intro` 文案及 ASCII 字形。
完整字体保留为源文件，不再随页面下载。更新介绍文案后，在安装了 `fonttools` 和
`brotli` 的 Python 环境运行 `python scripts/subset-intro-font.py` 重新生成。

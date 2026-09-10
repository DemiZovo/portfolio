---
title: WSL2 安装、常用命令与资源限制
description: 整理 WSL2 的安装方式、常用管理命令、Windows 文件访问和 .wslconfig 资源限制配置。
slug: wsl2-setup-and-commands
published: 2026-08-14
category: dev
tags: [WSL2, Windows, Linux, Docker]
draft: false
featured: false
toc: true
---

WSL（Windows Subsystem for Linux）适合需要同时使用 Windows 桌面环境和 Linux 开发工具的场景。它不要求单独划分双系统，也不需要手动维护一台传统虚拟机，就能在 Windows 中运行 Linux 发行版、Bash、Git 和常见开发脚本。

这篇笔记以 WSL2 为主，整理安装、日常管理、文件访问和资源限制配置。示例发行版使用 `Ubuntu-24.04`；实际名称应以本机 `wsl -l -v` 的输出为准。

## WSL2 适合解决什么问题

WSL2 的主要价值是让 Windows 与 Linux 开发环境共存：

- 在 Windows 中直接使用 Linux 命令行工具和软件包生态。
- 从 Linux 访问 Windows 磁盘，也能从 Windows 访问 Linux 文件。
- 为需要 Linux 环境的开发工具和容器工作流提供基础。
- 使用 `.wslconfig` 统一限制 WSL2 虚拟机的内存、处理器和交换空间。

WSL2 底层仍使用轻量虚拟化，因此不能简单理解为“完全没有虚拟机”。它会按需占用主机资源，也可能受到虚拟化、网络和文件系统边界的影响。

现代 WSL2 可以通过 WSLg 运行受支持的 Linux GUI 应用，但它更适合开发工具和单个应用，不用于替代完整的 Linux 桌面系统。

## 安装与检查 WSL2

首次安装时，以管理员身份打开 PowerShell，执行：

```powershell
wsl --install
```

该命令会启用所需组件并安装默认 Linux 发行版。安装完成后根据提示重启 Windows，再打开发行版完成 Linux 用户名和密码设置。

如果希望选择发行版，先查看在线列表：

```powershell
wsl --list --online
```

然后安装指定发行版：

```powershell
wsl --install -d Ubuntu-24.04
```

查看本机已经安装的发行版、运行状态和 WSL 版本：

```powershell
wsl --list --verbose
```

`wsl -l -o` 和 `wsl -l -v` 分别是上述两个查询命令的简写。

新安装通常默认使用 WSL2。如果需要显式设置后续安装的默认版本，可以执行：

```powershell
wsl --set-default-version 2
```

将已有发行版从 WSL1 转换为 WSL2：

```powershell
wsl --set-version Ubuntu-24.04 2
```

转换可能需要一段时间，开始前应确认发行版中重要数据已有备份。

## 日常启停与维护命令

进入指定发行版：

```powershell
wsl -d Ubuntu-24.04
```

检查 WSL 的整体状态和组件版本：

```powershell
wsl --status
wsl --version
```

更新 WSL：

```powershell
wsl --update
```

立即终止所有正在运行的发行版和 WSL2 轻量虚拟机：

```powershell
wsl --shutdown
```

修改 `.wslconfig` 后，需要执行 `wsl --shutdown`，下一次启动 WSL2 时配置才会重新加载。它也适合在不再使用 WSL2 时主动结束实例；但日常使用不必频繁手动关闭。

注销发行版会删除其中的全部数据：

```powershell
wsl --unregister Ubuntu-24.04
```

这不是普通的“退出登录”。执行前必须检查发行版名称，并备份代码、数据库和配置文件。

## 在 WSL 中访问文件

进入 Ubuntu 后，可以使用常见 Linux 命令检查当前环境：

```bash
free -h
pwd
ls -la
```

Windows 的盘符默认挂载到 `/mnt`。例如，访问 Windows 用户目录：

```bash
cd /mnt/c/Users/你的Windows用户名
```

反过来，可以在 Windows 文件资源管理器地址栏输入：

```text
\\wsl$\Ubuntu-24.04\home\你的Linux用户名
```

两套文件系统虽然可以互访，但项目放在哪里会影响工具行为和文件 I/O 性能。主要由 Linux 工具处理的项目，通常更适合保存在 WSL 的 Linux 文件系统；需要频繁由 Windows 原生程序处理的文件，则可以保存在 Windows 文件系统。不要在两边同时修改数据库文件或其他要求严格锁定的文件。

## 使用 .wslconfig 限制资源

`.wslconfig` 是 Windows 侧的全局 WSL2 配置文件，应放在：

```text
%UserProfile%\.wslconfig
```

它不应放进 Linux 发行版内部。下面是一份示例配置，数值需要根据主机硬件和实际负载调整：

```ini
[wsl2]
memory=8GB
processors=4
swap=2GB
```

字段含义如下：

- `memory`：WSL2 虚拟机可使用的内存上限。
- `processors`：WSL2 可使用的逻辑处理器数量。
- `swap`：为 WSL2 分配的交换空间大小；设为 `0` 表示禁用。

保存文件后，在 PowerShell 中执行：

```powershell
wsl --shutdown
```

重新进入 WSL，再检查内存：

```bash
free -h
```

`free -h` 可以帮助确认 Linux 看到的内存和交换空间，但不能单独证明 CPU 限制已经生效。处理器数量可以另行检查：

```bash
nproc
```

如果配置没有生效，优先检查文件名是否误写成 `.wslconfig.txt`、文件是否位于正确的 Windows 用户目录，以及发行版是否确实运行在 WSL2。

## 使用时需要保留的边界

WSL2 降低了 Windows 与 Linux 混合开发的成本，但它仍然是一层独立环境。排查问题时，应先确认命令究竟运行在 PowerShell 还是 Bash、路径属于 Windows 还是 Linux，以及配置作用于单个发行版还是整个 WSL2 虚拟机。

最值得固定下来的习惯有三个：用 `wsl -l -v` 确认发行版名称和版本；把 `.wslconfig` 放在 Windows 用户目录并在修改后完整关闭 WSL；执行 `wsl --unregister` 前始终把它视为不可恢复的数据删除操作。

## 参考资料

- [Install WSL](https://learn.microsoft.com/windows/wsl/install)
- [Basic commands for WSL](https://learn.microsoft.com/windows/wsl/basic-commands)
- [Advanced settings configuration in WSL](https://learn.microsoft.com/windows/wsl/wsl-config)
- [Run Linux GUI apps with WSL](https://learn.microsoft.com/windows/wsl/tutorials/gui-apps)

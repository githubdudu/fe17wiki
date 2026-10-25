# Astro Starter Kit: Basics

```sh
npm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## 重新生成数据

数据源是《火焰之纹章 Engage》在线数据表 xlsx（约 100 MB，不进仓库）。xlsx 更新后运行：

```sh
python3 scripts/x2c.py <xlsx路径> list                                  # 查看 sheet 编号
python3 scripts/x2c.py <xlsx路径> src/data/characters.csv 2 --clean    # 角色表
python3 scripts/x2c.py selftest                                         # 自检
```


# Plan

## Map to Master 大师证
第六章外传：秘密地旅行商人，地图下方靠右边宝箱可获取
第七章击败敌方boss奥尔坦希亚后可掉落获取
第八章结束后，道具店可购买，限1次
第十章击败敌方BOSS后可掉落获取
第十一章击败敌方弓箭手后可掉落获取
第十一章结束后，道具店可购买，限2次
第十二章保护其中一位村民NPC并通关后可获得
第十三章结束后，道具店可购买，限2次
第十四章结束后，道具店可购买，限2次
第十六章击败敌方玛伦后可掉落获取
第十六章结束后，道具店可购买，限2次
第十七章击败敌方最终BOSS可掉落获取
第十七章结束后，道具店可无限购买
第四弹DLC邪龙之章通关奖励（×1）
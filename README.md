# Assignment 3: Vibe coding network visualization

An interactive map of the 13 programs where the Doris Duke Foundation (DDF) pooled money with other funders. DDF sits in the middle, each program circles it, and each funder sits next to the programs it backs.

Click a program, a funder, or an area to see the details. The page is plain HTML, CSS, and JavaScript with D3 from a CDN, so there is no build step.

- `index.html`: page structure
- `styles.css`: layout and light/dark colors
- `app.js`: layout, map drawing, and interactions
- `data.js`: programs, funders, endowments, and websites (research as of November 12, 2026)

To run it locally, serve the folder with any static server, for example `python3 -m http.server`.

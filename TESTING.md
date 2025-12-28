# AniVerse - Manual Testing Guide

## Overview
This document provides comprehensive testing instructions for the AniVerse site after the restoration fixes.

## Prerequisites
- A modern web browser (Chrome, Firefox, Edge, or Safari)
- Local HTTP server (e.g., `python3 -m http.server 8080`) or access to the deployed site

## Test Scenarios

### 1. Home Page Load Test
**Objective**: Verify the home page loads correctly with anime listings

**Steps**:
1. Navigate to the AniVerse homepage
2. Wait for the page to fully load
3. Check browser console (F12 → Console tab)

**Expected Results**:
- ✅ Page loads without errors
- ✅ No `TypeError` or `ReferenceError` in console
- ✅ Console shows: "✅ Anime renderer loaded"
- ✅ Console shows: "Carregados [N] animes"
- ✅ "Novos Lançamentos" section displays anime cards
- ✅ "Catálogo Completo" section displays anime cards
- ✅ Anime cards have visible thumbnails and titles
- ✅ "Continuar Assistindo" shows empty state message if no watch history

### 2. Anime Rendering Test
**Objective**: Verify anime cards render in all sections

**Steps**:
1. Load the home page
2. Check "Novos Lançamentos" section
3. Check "Catálogo Completo" section
4. Click on "Animes" in navigation
5. Click on "Filmes" in navigation
6. Click on "OVAs" in navigation

**Expected Results**:
- ✅ All sections show anime cards with proper layout
- ✅ Cards display thumbnails, titles, and type labels
- ✅ Clicking cards opens the video modal
- ✅ Empty sections show appropriate "Nenhum anime encontrado" message
- ✅ Fallback rendering works if primary rendering fails

### 3. Video Player Test
**Objective**: Verify video player functionality and controls

**Steps**:
1. Click on any anime card (e.g., "Attack on Titan")
2. Video modal should appear
3. Test the following controls:
   - Play/Pause button
   - Timeline scrubbing
   - Volume button and slider
   - Picture-in-Picture button
   - Fullscreen button
4. Check episode and season selectors
5. Close the modal

**Expected Results**:
- ✅ Video modal opens with anime information
- ✅ Video player displays with custom controls
- ✅ Play/Pause button toggles playback
- ✅ Play/Pause icon changes between ▶ and ⏸
- ✅ Timeline progress bar updates during playback
- ✅ Clicking timeline seeks to that position
- ✅ Time display shows "MM:SS / MM:SS" format
- ✅ Volume button toggles mute
- ✅ Volume slider controls volume level
- ✅ Volume icon changes based on level (mute/low/high)
- ✅ Clicking video element itself toggles play/pause
- ✅ PiP button activates picture-in-picture mode
- ✅ Fullscreen button activates fullscreen mode
- ✅ Season selector shows available seasons
- ✅ Episode selector shows available episodes
- ✅ Skip Opening button appears during opening (if configured)
- ✅ Close button (×) closes the modal
- ✅ No `videoLoadTimeout` errors in console

### 4. Music Player Test
**Objective**: Verify music player functionality

**Steps**:
1. Click "Músicas" in navigation
2. Music section should display
3. Click play (▶) button on any music card
4. Observe audio element behavior

**Expected Results**:
- ✅ Músicas section displays music grid
- ✅ 33 music cards are visible
- ✅ Each card shows cover image, title, artist, and anime name
- ✅ Play button (▶) is visible on each card
- ✅ Clicking play button starts music playback
- ✅ Only one audio element exists (singleton pattern)
- ✅ Previous music stops when new music starts
- ✅ Music error messages appear if audio fails to load
- ✅ No duplicate audio elements in DOM

### 5. Navigation Test
**Objective**: Verify section navigation works correctly

**Steps**:
1. From home page, click "Animes" in navigation
2. Click "Filmes"
3. Click "OVAs"
4. Click "Músicas"
5. Click "Continuar Assistindo"
6. Click "Início" to return home

**Expected Results**:
- ✅ Navigation links change active state (highlighted)
- ✅ Only one section is visible at a time
- ✅ Each section shows appropriate content
- ✅ Section data loads on first visit
- ✅ Browser URL updates (# anchor)
- ✅ No JavaScript errors during navigation

### 6. Profile Modal Test
**Objective**: Verify profile configuration modal

**Steps**:
1. Click "Entrar" button in header
2. Profile modal should appear
3. Test customization options:
   - Enter a name
   - Select a pronoun
   - Choose a background color
   - Choose a gradient
   - Select a character
   - Choose a frame
4. Click "Salvar Perfil"
5. Reopen profile modal to verify saved data

**Expected Results**:
- ✅ Profile modal opens on "Entrar" click
- ✅ Name input field works
- ✅ Pronoun buttons are clickable
- ✅ Background color swatches are clickable
- ✅ Gradient options are clickable
- ✅ Character images are clickable and selectable
- ✅ Frame options are clickable
- ✅ Avatar preview updates in real-time
- ✅ "Salvar Perfil" button saves data
- ✅ Modal closes after saving
- ✅ Profile data persists in localStorage
- ✅ Close button (×) closes modal
- ✅ Clicking outside modal closes it

### 7. Continue Watching Test
**Objective**: Verify watch history saves and loads

**Steps**:
1. Open an anime video
2. Play for a few seconds
3. Close the video modal
4. Check "Continuar Assistindo" sections (home and dedicated)
5. Click on continue watching card
6. Click "Limpar Histórico" button

**Expected Results**:
- ✅ Continue watching sections show watched animes
- ✅ Progress bar displays on continue watching cards
- ✅ Season/Episode info shows correctly
- ✅ Progress percentage displays (e.g., "T1 • EP1 • 25%")
- ✅ Clicking continue watching card resumes from saved time
- ✅ "Limpar Histórico" confirms before clearing
- ✅ After clearing, sections show empty state
- ✅ Watch history persists in localStorage

## Console Checks

### Expected Console Messages (Success)
```
✅ AniVerse init check running
✅ Anime renderer loaded
✅ Carregados [N] animes
✅ Processando dados musicais...
✅ Biblioteca musical processada
✅ Dados dos animes carregados com sucesso!
✅ Loaded [N] new releases
✅ Loaded [N] catalog items
✅ Profile modal controls bound successfully
```

### Expected Console Messages (Warnings - OK)
```
⚠️ Failed to load resource: net::ERR_BLOCKED_BY_CLIENT (external CDN resources)
⚠️ Info section not found (optional section)
```

### Unexpected Console Messages (Errors - NOT OK)
```
❌ ReferenceError: videoLoadTimeout is not defined
❌ TypeError: Cannot read property 'X' of undefined
❌ Uncaught Error: ...
```

## Browser Compatibility

Test on the following browsers:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Edge (latest)
- ✅ Safari (latest)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

## Performance Checks

- ✅ Page load time < 3 seconds
- ✅ No memory leaks after navigation
- ✅ Smooth scrolling and animations
- ✅ Video controls responsive
- ✅ No frame drops during video playback

## Accessibility Checks

- ✅ Keyboard navigation works
- ✅ ARIA labels present where appropriate
- ✅ Contrast ratios meet WCAG standards
- ✅ Focus indicators visible
- ✅ Screen reader friendly

## Known Limitations

1. External resource loading may fail due to:
   - Ad blockers
   - CORS policies
   - Network restrictions
   - Domain blocks

2. Video playback depends on:
   - Video URL accessibility
   - Browser codec support
   - Network bandwidth

3. Music playback requires:
   - Audio URL accessibility
   - Browser audio support

## Troubleshooting

### Issue: Anime cards not showing
**Solution**: Check console for errors, verify anime-data.json loads successfully

### Issue: Video not playing
**Solution**: Check video URL accessibility, try different video source

### Issue: Music not playing
**Solution**: Check audio URL accessibility, verify singleton audio element exists

### Issue: Profile not saving
**Solution**: Check localStorage is enabled in browser, clear cache and retry

### Issue: Navigation not working
**Solution**: Hard refresh (Ctrl+F5), check console for JavaScript errors

## Reporting Issues

When reporting issues, please include:
1. Browser name and version
2. Console error messages (screenshot or text)
3. Steps to reproduce
4. Expected vs actual behavior
5. Screenshots or screen recordings

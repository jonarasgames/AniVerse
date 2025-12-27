(function() {
    // Array of 12 background video URLs for the hero section
    const HERO_VIDEOS = [
        "https://files.catbox.moe/9sqmzv.mp4",
        "https://files.catbox.moe/tff74x.mp4",
        "https://files.catbox.moe/i1qpqg.mp4",
        "https://files.catbox.moe/0cadkg.mp4",
        "https://files.catbox.moe/kevo22.mp4",
        "https://files.catbox.moe/mzs9xm.mp4",
        "https://files.catbox.moe/m7wj5i.mp4",
        "https://files.catbox.moe/uztzgt.mp4",
        "https://files.catbox.moe/uvvlf1.mp4",
        "https://files.catbox.moe/ftmfgn.mp4",
        "https://files.catbox.moe/9jmrp0.mp4",
        "https://files.catbox.moe/s0fowe.mp4"
    ];

    let currentVideoIndex = 0;
    let video1, video2;
    let currentVideo, nextVideo;

    function init() {
        const heroSection = document.querySelector('.hero');
        if (!heroSection) {
            console.warn('Hero section not found, skipping video rotator');
            return;
        }

        // Create video container
        const videoContainer = document.createElement('div');
        videoContainer.className = 'hero-video-container';
        videoContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            z-index: 0;
        `;

        // Create two video elements for crossfade effect
        video1 = createVideoElement();
        video2 = createVideoElement();

        videoContainer.appendChild(video1);
        videoContainer.appendChild(video2);
        heroSection.insertBefore(videoContainer, heroSection.firstChild);

        // Set initial videos
        currentVideo = video1;
        nextVideo = video2;

        // Start first video
        loadVideo(currentVideo, HERO_VIDEOS[0]);
        currentVideo.style.opacity = '1';

        // Preload next video
        preloadNextVideo();

        // Set up rotation when video ends
        currentVideo.addEventListener('ended', rotateVideo);

        console.log('✅ Hero video rotator initialized');
    }

    function createVideoElement() {
        const video = document.createElement('video');
        video.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            min-width: 100%;
            min-height: 100%;
            width: auto;
            height: auto;
            transform: translate(-50%, -50%);
            object-fit: cover;
            opacity: 0;
            transition: opacity 1.5s ease-in-out;
        `;
        video.muted = true;
        video.playsInline = true;
        return video;
    }

    function loadVideo(videoElement, url) {
        videoElement.src = url;
        videoElement.load();
    }

    function preloadNextVideo() {
        const nextIndex = (currentVideoIndex + 1) % HERO_VIDEOS.length;
        loadVideo(nextVideo, HERO_VIDEOS[nextIndex]);
    }

    function rotateVideo() {
        // Move to next video index
        currentVideoIndex = (currentVideoIndex + 1) % HERO_VIDEOS.length;

        // Start playing next video
        nextVideo.play().catch(err => {
            console.warn('Error playing video:', err);
        });

        // Crossfade effect
        nextVideo.style.opacity = '1';
        currentVideo.style.opacity = '0';

        // Swap references
        const temp = currentVideo;
        currentVideo = nextVideo;
        nextVideo = temp;

        // Set up event listener for the new current video
        currentVideo.addEventListener('ended', rotateVideo);

        // Preload the next video in sequence
        preloadNextVideo();
    }

    // Auto-start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Attempt to play first video when user interacts (for autoplay restrictions)
    function attemptAutoplay() {
        if (currentVideo && currentVideo.paused) {
            currentVideo.play().catch(err => {
                console.log('Autoplay prevented, will start on user interaction');
            });
        }
    }

    document.addEventListener('click', attemptAutoplay, { once: true });
    document.addEventListener('touchstart', attemptAutoplay, { once: true });
    document.addEventListener('scroll', attemptAutoplay, { once: true });

})();

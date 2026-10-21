import ffmpeg from 'fluent-ffmpeg';

ffmpeg()
  .input('testsrc=duration=1:size=960x1080:rate=30')
  .inputOptions(['-f lavfi'])
  .complexFilter([
    '[0:v]split[v_rgb][v_depth_base]',
    '[v_depth_base]edgedetect=low=0.1:high=0.4,format=gray[v_depth]',
    '[v_rgb][v_depth]hstack=inputs=2[vout_volumetric]'
  ])
  .outputOptions(['-map [vout_volumetric]'])
  .save('output.mp4')
  .on('end', () => console.log('success'))
  .on('error', (err) => console.error('error', err.message));

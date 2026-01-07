/**
 * Spinning Box
 *
 * Edit this file and save to hot-reload!
 */

app.on('update', delta => {
  // Called every frame
  // delta is time since last frame in seconds
  // console.log('Spinning Box updated!', delta)
  app.rotation.y += 1 * delta
})

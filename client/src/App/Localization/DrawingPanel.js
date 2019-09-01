import React, { useCallback, useEffect, useState } from 'react'
import { connect } from 'react-redux'

import Canvas, { BOX, MOVE } from 'common/Canvas/Canvas'
import CrossHair from 'common/CrossHair/CrossHair'
import { createBox, deleteBox, createLabel, syncAction } from 'redux/collection'
import { setActiveBox, setActiveLabel } from 'redux/editor'
import { uniqueColor } from './color-utils'

const useIsControlPressed = () => {
  const [isPressed, setIsPressed] = useState(false)
  const handleKeyDown = useCallback(e => {
    if (document.activeElement.tagName.toLowerCase() === 'input') {
      setIsPressed(false)
    }

    if (e.ctrlKey || e.metaKey) {
      setIsPressed(true)
    }

    if (e.shiftKey) {
      setIsPressed(false)
    }
  }, [])

  const handleKeyUp = useCallback(e => {
    setIsPressed(false)
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    document.addEventListener('msvisibilitychange', handleKeyUp)
    document.addEventListener('webkitvisibilitychange', handleKeyUp)
    document.addEventListener('visibilitychange', handleKeyUp)
    window.addEventListener('blur', handleKeyUp)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)

      document.removeEventListener('msvisibilitychange', handleKeyUp)
      document.removeEventListener('webkitvisibilitychange', handleKeyUp)
      document.removeEventListener('visibilitychange', handleKeyUp)
      window.removeEventListener('blur', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  return isPressed
}

const useToggleLabel = (activeLabel, labels, setActiveLabel) => {
  const handleKeyDown = useCallback(
    e => {
      if (document.activeElement.tagName.toLowerCase() === 'input') {
        return
      }

      const char = e.key.toLowerCase()
      if (char === 'q') {
        setActiveLabel(
          labels[(labels.indexOf(activeLabel) + 1) % labels.length]
        )
      }
      let labelIndex = parseInt(char) - 1
      // Treat 0 as 10 because it comes after 9 on the keyboard.
      if (labelIndex < 0) {
        labelIndex = 9
      }
      if (labelIndex < labels.length) {
        setActiveLabel(labels[labelIndex])
      }
    },
    [activeLabel, labels, setActiveLabel]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}

const DrawingPanel = ({
  setActiveLabel,
  setActiveBox,
  syncAction,
  annotations,
  selectedImage,
  image,
  tool,
  labels,
  activeLabel,
  activeBox,
  hoveredBox
}) => {
  const bboxes = annotations[selectedImage] || []

  const isControlPressed = useIsControlPressed()
  useToggleLabel(activeLabel, labels, setActiveLabel)

  const handleBoxStarted = useCallback(
    box => {
      setActiveBox(box)
    },
    [setActiveBox]
  )

  const handleBoxChanged = useCallback(
    box => {
      setActiveBox(box)
    },
    [setActiveBox]
  )

  const handleBoxFinished = useCallback(
    box => {
      // If the active label doesn't exit, create it. We shouldn't have to trim
      // it, because it shouldn't be anything other than `Untitled Label`.
      if (!labels.includes(box.label)) {
        syncAction(createLabel, [box.label])
        setActiveLabel(box.label)
      }
      const boxToUpdate = bboxes.find(b => b.id === box.id)
      if (boxToUpdate) {
        syncAction(deleteBox, [selectedImage, boxToUpdate])
        syncAction(createBox, [selectedImage, box])
      } else {
        syncAction(createBox, [selectedImage, box])
      }
      setActiveBox(undefined)
    },
    [labels, bboxes, setActiveBox, syncAction, setActiveLabel, selectedImage]
  )

  let mergedBoxes = [...bboxes]
  if (activeBox) {
    mergedBoxes = mergedBoxes.filter(box => box.id !== activeBox.id)
    mergedBoxes.unshift(activeBox)
  }

  const cmap = labels.reduce((acc, label, i) => {
    acc[label] = uniqueColor(i, labels.length)
    return acc
  }, {})

  const activeColor = cmap[activeLabel] || 'white'

  const activeTool = isControlPressed ? MOVE : tool

  return (
    <div
      style={{
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        border: '1px solid var(--border)'
      }}
    >
      <CrossHair
        color={activeColor}
        active={activeTool === BOX}
        children={
          <div
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Canvas
              mode={activeTool}
              activeLabel={activeLabel}
              cmap={cmap}
              bboxes={mergedBoxes}
              image={image}
              hovered={hoveredBox}
              onBoxStarted={handleBoxStarted}
              onBoxChanged={handleBoxChanged}
              onBoxFinished={handleBoxFinished}
            />
          </div>
        }
      />
    </div>
  )
}

const mapStateToProps = state => ({
  annotations: state.collection.annotations,
  labels: state.collection.labels,
  activeBox: state.editor.box,
  activeLabel: state.editor.label,
  hoveredBox: state.editor.hoveredBox,
  tool: state.editor.tool
})
const mapDispatchToProps = {
  syncAction,
  setActiveBox,
  setActiveLabel
}
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DrawingPanel)

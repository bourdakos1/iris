import React, { useEffect, useState, useCallback } from 'react'
import localforage from 'localforage'
import { connect } from 'react-redux'
import { Loading } from 'carbon-components-react'
import queryString from 'query-string'
import Dropzone from 'react-dropzone'

import history from 'globalHistory'
import {
  loadCollection,
  clearCollection,
  setCollectionType,
  setCollection,
  uploadImages
} from 'redux/collection'
import Localization from './Localization/Localization'
import Classification from './Classification/Classification'
import { locationFinder } from './endpointFinder'
import ChooseBucketModal from './ChooseBucketModal'
import AppBar from './AppBar'
import AppBarLayout from './AppBarLayout'

import styles from './App.module.css'
import { generateUUID, readFile, imageToCanvas, canvasToFile } from 'Utils'

const generateFiles = async images => {
  const readFiles = images.map(async file => {
    const image = await readFile(file)
    const canvas = await imageToCanvas(image, 1500, 1500, 'scaleAspectFit')
    const name = `${generateUUID()}.jpg`
    const dataURL = canvas.toDataURL('image/jpeg')
    await localforage.setItem(name, dataURL)
    return canvasToFile(canvas, name)
  })
  return await Promise.all(readFiles)
}

const AnnotationPanel = ({ bucket, location, type }) => {
  switch (type) {
    case 'classification':
      return <Classification />
    case 'localization':
      return <Localization location={location} bucket={bucket} />
    default:
      return null
  }
}

const App = ({
  match: {
    params: { bucket }
  },
  location: { search },
  setCollection,
  clearCollection,
  setCollectionType,
  uploadImages,
  profile,
  collection
}) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(0)
  const [dropActive, setDropActive] = useState(false)

  const location = queryString.parse(search).location

  useEffect(() => {
    const asyncEffect = async () => {
      try {
        setCollection(await loadCollection(bucket, location))
      } catch (error) {
        console.error(error)
        if (error.message === 'Forbidden') {
          history.push('/login')
          return
        }
        await locationFinder(bucket)
      }
      setLoading(false)
    }
    asyncEffect()
    return () => clearCollection()
  }, [bucket, clearCollection, location, setCollection])

  const handleClose = useCallback(() => {
    history.push('/')
  }, [])

  const handleSubmit = useCallback(
    async choice => {
      setSaving(s => s + 1)
      setCollectionType(choice, () => {
        setSaving(s => s - 1)
      })
    },
    [setCollectionType]
  )

  const handleDragEnter = useCallback(() => {
    setDropActive(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDropActive(false)
  }, [])

  const handleDrop = useCallback(
    async fileList => {
      setDropActive(false)
      const images = fileList.filter(file => file.type.startsWith('image/'))
      const files = await generateFiles(images)
      uploadImages(files)
    },
    [uploadImages]
  )

  const type = collection.type

  return (
    <>
      <ChooseBucketModal
        isOpen={!loading && !type}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
      <Loading active={loading} />

      <AppBarLayout
        appBar={<AppBar bucket={bucket} profile={profile} />}
        content={
          <Dropzone
            disableClick
            style={{ position: 'absolute' }} /* must override from here */
            className={styles.dropzone}
            accept="image/*,video/*"
            onDrop={handleDrop}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
          >
            <div className={dropActive ? styles.dropActive : styles.drop}>
              <div className={styles.dropOutline}>
                <div className={styles.dropText}>
                  Drop to upload your images
                </div>
              </div>
            </div>
            <AnnotationPanel location={location} bucket={bucket} type={type} />
          </Dropzone>
        }
      />
    </>
  )
}

const mapStateToProps = state => ({
  collection: state.collection,
  profile: state.profile
})
const mapDispatchToProps = {
  setCollection,
  clearCollection,
  setCollectionType,
  uploadImages
}
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App)

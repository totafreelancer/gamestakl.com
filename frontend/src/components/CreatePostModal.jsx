import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { X, ImagePlus } from 'lucide-react'
import { forumService } from '../api/forum'
import { toast } from 'react-hot-toast'

const CreatePostModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const fileInputRef = useRef(null)
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm()

  const categories = [
    { value: 'PC', label: 'PC Gaming' },
    { value: 'MOBILE', label: 'Mobile Gaming' },
    { value: 'NEWS', label: 'Gaming News' },
    { value: 'GENERAL', label: 'General Discussion' },
  ]

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    setSelectedImage(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onSubmit = async (data) => {
    // Validate: at least content or image must be provided
    if (!data.content?.trim() && !selectedImage) {
      toast.error('Please add some content or an image to your post')
      return
    }

    try {
      setLoading(true)
      
      // Use FormData if there's an image
      if (selectedImage) {
        const formData = new FormData()
        formData.append('content', data.content || '')
        formData.append('category', data.category || 'GENERAL')
        formData.append('image', selectedImage)
        await forumService.createPostWithImage(formData)
      } else {
        await forumService.createPost(data)
      }
      
      toast.success('Post created successfully!')
      reset()
      setSelectedImage(null)
      setImagePreview(null)
      onSuccess()
    } catch (error) {
      const errorMsg = error.error || error.message || 'Failed to create post'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-dark-800 dark:border-dark-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-700">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Create New Post</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-900 dark:hover:bg-dark-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 md:p-6 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              Category
            </label>
            <select
              {...register('category', { required: 'Category is required' })}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-cyan-500 dark:bg-dark-700 dark:border-dark-600 dark:text-white"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-red-400 text-sm mt-1">{errors.category.message}</p>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              Content {selectedImage && <span className="text-gray-400 font-normal">(optional — image attached)</span>}
            </label>
            <textarea
              {...register('content')}
              placeholder={selectedImage ? "Add a caption (optional)..." : "Write your post content..."}
              rows={selectedImage ? 3 : 6}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none dark:bg-dark-700 dark:border-dark-600 dark:text-white"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              Image {!selectedImage && <span className="text-gray-400 font-normal">(optional — post text only)</span>}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full max-h-64 object-cover rounded-lg border border-gray-300 dark:border-dark-600"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-cyan-500 transition-colors dark:border-dark-600 dark:hover:border-cyan-500"
              >
                <ImagePlus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Click to add an image
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Max size: 5MB
                </p>
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreatePostModal
